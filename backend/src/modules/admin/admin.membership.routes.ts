import { Router, Response } from 'express';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { User, Partner, Institution, Course, Sponsor, SponsorRequest, Payment, Membership, MembershipPlan } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { maskAadhaar } from '../../services/aadhaar';
import { membershipView } from '../../services/membership';
import { EDU_LABEL } from '../../services/education';
import { PRIVATE_DIR } from '../../config/storage';

const r = Router(); r.use(authenticate, requireRole('ADMIN'));
const oid = (id: string) => { if (!isValidObjectId(id)) throw new HttpError(400, 'Invalid id'); return id; };
const esc = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const csv = (res: Response, name: string, head: string[], rows: any[][]) => {
  const cell = (v: any) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  res.type('text/csv').set('Content-Disposition', `attachment; filename="${name}"`).send('\ufeff' + [head, ...rows].map((x) => x.map(cell).join(',')).join('\n'));
};
const paging = (q: any, max = 100) => { const limit = Math.min(max, Math.max(1, +q.limit || 20)), page = Math.max(1, +q.page || 1); return { limit, page, skip: (page - 1) * limit }; };

// ---- Dashboard
r.get('/dashboard', wrap(async (_req, res) => {
  const now = new Date();
  const [members, students, parents, partners, activePartners, pendingPartners, institutes, pendingOfferings, approvedOfferings, sponsors, pendingPayments, pendingSponsorRequests, succeeded, failed, rev, mships] = await Promise.all([
    User.countDocuments({ role: 'MEMBER', deletedAt: null }), User.countDocuments({ role: 'MEMBER', memberType: 'STUDENT', deletedAt: null }), User.countDocuments({ role: 'MEMBER', memberType: 'PARENT', deletedAt: null }),
    Partner.countDocuments({ deletedAt: null }), Partner.countDocuments({ approval: 'APPROVED', deletedAt: null }), Partner.countDocuments({ approval: 'PENDING', deletedAt: null }), Institution.countDocuments({ deletedAt: null }),
    Course.countDocuments({ status: 'PENDING_APPROVAL', deletedAt: null }), Course.countDocuments({ status: 'APPROVED', deletedAt: null }), Sponsor.countDocuments({ active: true }),
    Payment.countDocuments({ status: 'UNDER_REVIEW' }), SponsorRequest.countDocuments({ status: { $in: ['PAYMENT_REVIEW', 'PENDING_APPROVAL'] } }),
    Payment.countDocuments({ status: 'APPROVED' }), Payment.countDocuments({ status: 'FAILED' }),
    Payment.aggregate([{ $match: { status: 'APPROVED' } }, { $group: { _id: '$purpose', total: { $sum: '$amount' } } }]),
    Membership.find({ status: 'ACTIVE' }).select('planKind expiresAt').lean(),
  ]);
  const byPurpose = Object.fromEntries(rev.map((x: any) => [x._id, x.total]));
  const active = (mships as any[]).filter((m) => m.planKind === 'LIFETIME' || !m.expiresAt || new Date(m.expiresAt) > now);
  res.json({ members, students, parents, activeMembers: active.length, lifetimeMembers: active.filter((m) => m.planKind === 'LIFETIME').length, expiredMembers: mships.length - active.length,
    partners, activePartners, pendingPartners, institutes, pendingOfferings, approvedOfferings, sponsors, pendingPayments, pendingSponsorRequests, successfulPayments: succeeded, failedPayments: failed,
    revenue: { membership: byPurpose.MEMBERSHIP || 0, partner: byPurpose.LISTING || 0, sponsorship: byPurpose.SPONSORSHIP || 0, booking: byPurpose.BOOKING || 0, total: Object.values(byPurpose).reduce((a: number, b: any) => a + b, 0) } });
}));

// ---- Members: search + filters + pagination
async function memberQuery(q: any) {
  const filter: any = { role: 'MEMBER', deletedAt: null };
  if (q.memberType) filter.memberType = q.memberType;
  if (q.status === 'SUSPENDED') filter.status = 'SUSPENDED';
  const s = String(q.q || '').trim();
  if (s) {
    const rx = new RegExp(esc(s), 'i'); const byId: any[] = await Membership.find({ membershipId: rx }).select('user').lean();
    filter.$or = [{ firstName: rx }, { lastName: rx }, { phone: rx }, { email: rx }, { pin: rx }, { city: rx }, { _id: { $in: byId.map((m) => m.user) } }];
  }
  return filter;
}
const memberRow = (u: any, m: any) => { const v = membershipView(m); return { _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' '), memberType: u.memberType, phone: u.phone, email: u.email, city: u.city, state: u.state, district: u.district, pin: u.pin,
  education: EDU_LABEL[u.educationLevel] || u.educationLevel, status: u.status, membershipStatus: v.status, membershipId: m?.membershipId, planName: m?.planName, lifetime: v.lifetime, validUntil: v.validUntil, createdAt: u.createdAt, hasPhoto: !!u.photoKey }; };
r.get('/members', wrap(async (req, res) => {
  const { limit, page, skip } = paging(req.query); const filter = await memberQuery(req.query);
  const [rows, total]: any[] = await Promise.all([User.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  const ms: any[] = await Membership.find({ user: { $in: rows.map((u: any) => u._id) } }).lean();
  let items = rows.map((u: any) => memberRow(u, ms.find((m) => String(m.user) === String(u._id))));
  if (req.query.membership) items = items.filter((i: any) => i.membershipStatus === req.query.membership); // filtered after paging: fine for an admin list
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));
r.get('/members/export.csv', wrap(async (req, res) => {
  const rows: any[] = await User.find(await memberQuery(req.query)).sort('-createdAt').limit(20000).lean(); const ms: any[] = await Membership.find({ user: { $in: rows.map((u) => u._id) } }).lean();
  csv(res, 'members.csv', ['Name', 'Type', 'Mobile', 'Email', 'City', 'District', 'State', 'PIN', 'Education', 'Account', 'Membership', 'Member ID', 'Plan', 'Valid until', 'Registered'],
    rows.map((u) => { const i = memberRow(u, ms.find((m) => String(m.user) === String(u._id))); return [i.name, i.memberType, i.phone, i.email, i.city, i.district, i.state, i.pin, i.education, i.status, i.membershipStatus, i.membershipId, i.planName, i.lifetime ? 'Lifetime' : i.validUntil ? new Date(i.validUntil).toISOString().slice(0, 10) : '', new Date(i.createdAt).toISOString().slice(0, 10)]; }));
}));
r.get('/members/:id', wrap(async (req, res) => {
  const u: any = await User.findOne({ _id: oid(req.params.id), role: 'MEMBER' }).lean(); if (!u) throw new HttpError(404, 'Member not found');
  const m: any = await Membership.findOne({ user: u._id }).lean(); const pays = await Payment.find({ user: u._id }).sort('-createdAt').select('-proofKey').lean();
  res.json({ ...memberRow(u, m), dob: u.dob, gender: u.gender, address: u.address, school: u.school, aadhaarMasked: maskAadhaar(u.aadhaarLast4), startsAt: m?.startsAt, payments: pays }); // full Aadhaar is never exposed, even to admins
}));
r.get('/members/:id/photo', wrap(async (req, res) => {
  const u: any = await User.findOne({ _id: oid(req.params.id), role: 'MEMBER' }).select('photoKey'); if (!u?.photoKey) throw new HttpError(404, 'No photo');
  res.sendFile(path.join(PRIVATE_DIR, path.basename(u.photoKey)));
}));
r.put('/members/:id/status', validate(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) })), wrap(async (req, res) => {
  const u = await User.findOneAndUpdate({ _id: oid(req.params.id), role: 'MEMBER' }, { status: req.body.status }, { new: true }); if (!u) throw new HttpError(404, 'Member not found'); res.json({ status: u.status });
}));

// ---- Membership plans (any number, any price, set by the admin)
const planSchema = z.object({ name: z.string().trim().min(2).max(80), kind: z.enum(['YEARLY', 'LIFETIME']), price: z.coerce.number().min(0), validityDays: z.coerce.number().int().min(1).max(36500).default(365),
  educationGroup: z.enum(['ANY', 'LKG_SSLC', 'PUC_DEGREE']).default('ANY'), description: z.string().max(300).optional(), benefits: z.array(z.string().max(100)).max(15).default([]), active: z.boolean().default(true), order: z.coerce.number().default(0) });
r.get('/plans', wrap(async (_req, res) => { res.json({ items: await MembershipPlan.find().sort('order price').lean() }); }));
r.post('/plans', validate(planSchema), wrap(async (req, res) => { res.status(201).json(await MembershipPlan.create(req.body)); }));
r.put('/plans/:id', validate(planSchema.partial()), wrap(async (req, res) => { const p = await MembershipPlan.findByIdAndUpdate(oid(req.params.id), req.body, { new: true }); if (!p) throw new HttpError(404, 'Plan not found'); res.json(p); }));
r.delete('/plans/:id', wrap(async (req, res) => {
  const used = await Payment.exists({ plan: oid(req.params.id) });
  if (used) { await MembershipPlan.findByIdAndUpdate(req.params.id, { active: false }); return res.json({ message: 'This plan has payments, so it was deactivated instead of deleted.' }); }
  await MembershipPlan.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' });
}));

// ---- Payments: filters, pagination, CSV
const payFilter = (q: any) => { const f: any = {}; for (const k of ['status', 'purpose', 'method']) if (q[k]) f[k] = String(q[k]); return f; };
r.get('/payments', wrap(async (req, res) => {
  const { limit, page, skip } = paging(req.query); const f = payFilter(req.query);
  const [items, total]: any[] = await Promise.all([Payment.find(f).sort('-createdAt').skip(skip).limit(limit).populate('user', 'firstName lastName email phone').populate('plan', 'name kind').populate({ path: 'booking', select: 'bookingNo snapshot' }).lean(), Payment.countDocuments(f)]);
  res.json({ items: items.map((p: any) => ({ ...p, hasProof: !!p.proofKey, proofKey: undefined })), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));
r.get('/payments/export.csv', wrap(async (req, res) => {
  const items: any[] = await Payment.find(payFilter(req.query)).sort('-createdAt').limit(20000).populate('user', 'firstName lastName phone email').populate('plan', 'name').lean();
  csv(res, 'payments.csv', ['Date', 'Purpose', 'Plan', 'Amount (INR)', 'Status', 'Method', 'Transaction / Order ID', 'Gateway payment ID', 'Name', 'Mobile', 'Email'],
    items.map((p) => [new Date(p.createdAt).toISOString().slice(0, 16).replace('T', ' '), p.purpose, p.plan?.name, p.amount, p.status, p.method, p.transactionId, p.gatewayPaymentId, [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' '), p.user?.phone, p.user?.email]));
}));
export default r;
