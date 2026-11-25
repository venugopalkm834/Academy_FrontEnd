import { Router, Request } from 'express';
import { z } from 'zod';
import { User, Partner, Institution, Course, Sponsor, Booking, Payment, SponsorRequest } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { applyPrice } from '../../services/course-pricing';
import { getSettings } from '../../services/settings';
import { computeListing } from '../../services/access';
import { onPaymentSubmitted } from '../../services/events';

const r = Router(); r.use(authenticate, requireRole('PARTNER'));
// Finds the partner's profile; creates any missing piece (accounts made by older versions had no institution record).
const ctx = async (req: Request) => {
  const user: any = await User.findById(req.user!.id);
  if (!user) throw new HttpError(404, 'Account not found. Please log in again.');
  const partner: any = (await Partner.findOne({ user: user._id })) || (await Partner.create({ user: user._id, institutionName: user.firstName, institutionType: 'OTHER', contactName: user.firstName }));
  const institution: any = (await Institution.findOne({ partner: partner._id })) ||
    (await Institution.create({ partner: partner._id, name: partner.institutionName, type: partner.institutionType, address: user.address, city: user.city, state: user.state, pin: user.pin, contactPerson: partner.contactName, contactPhone: user.phone, email: user.email, website: partner.website }));
  return { partner, institution };
};
const own = async (req: Request) => {
  const { institution } = await ctx(req);
  const c = await Course.findOne({ _id: req.params.id, institution: institution._id, deletedAt: null });
  if (!c) throw new HttpError(404, 'Offering not found');
  return c;
};

r.get('/dashboard', wrap(async (req, res) => {
  const { partner, institution } = await ctx(req);
  const rows = await Course.aggregate([{ $match: { institution: institution._id, deletedAt: null } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  res.json({ approval: partner.approval, rejectionReason: partner.rejectionReason, name: institution.name, listing: computeListing(await getSettings(), partner),
    profileComplete: !!(institution.description && institution.contactPhone && institution.logoUrl),
    counts: Object.fromEntries(rows.map((x) => [x._id, x.n])), sponsored: !!(await Sponsor.exists({ institution: institution._id, active: true })) });
}));

const profileSchema = z.object({
  name: z.string().min(2).max(120), description: z.string().max(2000).optional(), services: z.array(z.string().max(40)).max(20).default([]),
  contactPerson: z.string().max(80).optional(), contactPhone: z.string().max(20).optional(), email: z.string().email().optional(), website: z.string().url().optional().or(z.literal('')),
  address: z.string().max(300).optional(), city: z.string().max(60).optional(), district: z.string().max(60).optional(), state: z.string().max(60).optional(), pin: z.string().max(10).optional(),
  logoUrl: z.string().max(300).optional(), coverUrl: z.string().max(300).optional(),
});
r.get('/profile', wrap(async (req, res) => {
  const { partner, institution } = await ctx(req);
  res.json({ institution, approval: partner.approval, rejectionReason: partner.rejectionReason, hasDocument: !!partner.registrationDocKey });
}));
r.put('/profile', validate(profileSchema), wrap(async (req, res) => {
  const { partner, institution } = await ctx(req);
  institution.set(req.body); await institution.save();
  partner.institutionName = institution.name; if (institution.logoUrl) partner.logoUrl = institution.logoUrl; await partner.save();
  res.json({ institution });
}));

const row = z.object({ label: z.string().min(1).max(60), amount: z.coerce.number().min(0) });
const courseSchema = z.object({
  name: z.string().min(2).max(120), className: z.string().max(80).optional(), serviceType: z.string().max(40).optional(), description: z.string().max(3000).optional(),
  duration: z.string().max(60).optional(), seats: z.coerce.number().min(0).default(0), imageUrl: z.string().max(300).optional(),
  originalFee: z.coerce.number().min(0), institutionDiscountPct: z.coerce.number().min(0).max(100).default(0),
  admissionFee: z.coerce.number().min(0).default(0), additionalFees: z.coerce.number().min(0).default(0),
  feeStructure: z.array(row).max(20).default([]), offerNote: z.string().max(300).optional(), offerExpiresAt: z.coerce.date().optional(),
});
r.get('/courses', wrap(async (req, res) => { const { institution } = await ctx(req); res.json({ items: await Course.find({ institution: institution._id, deletedAt: null }).sort('-updatedAt') }); }));
r.get('/courses/:id', wrap(async (req, res) => { res.json(await own(req)); }));
r.post('/courses', validate(courseSchema), wrap(async (req, res) => {
  const { institution } = await ctx(req);
  const c = new Course({ ...req.body, institution: institution._id, status: 'DRAFT' }); await applyPrice(c); await c.save();
  res.status(201).json(c);
}));
r.put('/courses/:id', validate(courseSchema), wrap(async (req, res) => {
  const c = await own(req); c.set(req.body);
  if (c.status === 'APPROVED' || c.status === 'PENDING_APPROVAL') c.status = 'PENDING_APPROVAL'; // any edit needs re-approval
  else if (c.status === 'REJECTED') c.status = 'DRAFT';
  await applyPrice(c); await c.save(); res.json(c);
}));
r.post('/courses/:id/submit', wrap(async (req, res) => {
  const { partner } = await ctx(req);
  if (partner.approval !== 'APPROVED') throw new HttpError(400, 'Your institution must be approved by the admin before you can submit offerings.');
  if (computeListing(await getSettings(), partner).needsPayment) throw new HttpError(402, 'Pay the listing fee under Plans & Payments before submitting offerings.');
  const c = await own(req); c.status = 'PENDING_APPROVAL'; c.rejectionReason = undefined; await c.save(); res.json(c);
}));
r.delete('/courses/:id', wrap(async (req, res) => { const c = await own(req); c.deletedAt = new Date(); await c.save(); res.json({ message: 'Deleted' }); }));
r.get('/bookings', wrap(async (req, res) => { // only paid / confirmed bookings are shown to the partner
  const { institution } = await ctx(req);
  res.json({ items: await Booking.find({ institution: institution._id, status: 'CONFIRMED' }).sort('-createdAt').populate('member', 'firstName lastName email phone city') });
}));

// ---- Plans & payments: Plan A (normal listing) and Plan B (featured sponsorship), both verified by the admin
const payBody = z.object({ transactionId: z.string().trim().min(6, 'Enter the transaction / UTR ID').max(40), proofKey: z.string().regex(/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/, 'Please upload your payment screenshot') });
r.get('/plans', wrap(async (req, res) => {
  const { partner, institution } = await ctx(req); const s = await getSettings();
  const requests: any[] = await SponsorRequest.find({ institution: institution._id }).sort('-createdAt').lean();
  const pays: any[] = await Payment.find({ user: req.user!.id, purpose: { $in: ['LISTING', 'SPONSORSHIP'] } }).sort('createdAt').lean();
  const listingPays = pays.filter((p) => p.purpose === 'LISTING');
  res.json({ approval: partner.approval, listing: computeListing(s, partner),
    listingPaymentPending: listingPays.some((p) => p.status === 'UNDER_REVIEW'), listingRejection: listingPays.filter((p) => p.status === 'REJECTED').pop()?.rejectionReason,
    sponsorFee: s.partnerSponsorFee || 0, sponsorDurationDays: s.sponsorDurationDays || 30, bannerFee: s.partnerBannerFee || 0, bannerDurationDays: s.bannerDurationDays || 30,
    requests: requests.map((x) => ({ ...x, payment: (() => { const p = pays.filter((y) => String(y.sponsorRequest) === String(x._id)).pop(); return p ? { status: p.status, rejectionReason: p.rejectionReason } : null; })() })) });
}));
r.post('/listing/pay', validate(payBody), wrap(async (req, res) => {
  const { partner } = await ctx(req); const s = await getSettings(); const l = computeListing(s, partner);
  if (!(s.partnerListingFee > 0)) throw new HttpError(400, 'Listing is free right now.');
  if (l.active) throw new HttpError(400, 'Your listing is already active.');
  if (await Payment.exists({ user: req.user!.id, purpose: 'LISTING', status: 'UNDER_REVIEW' })) throw new HttpError(409, 'Your previous payment is still under review.');
  const lp = await Payment.create({ user: req.user!.id, purpose: 'LISTING', amount: s.partnerListingFee, transactionId: req.body.transactionId, proofKey: req.body.proofKey });
  await onPaymentSubmitted(lp); partner.listingStatus = 'PENDING'; await partner.save(); res.status(201).json({ message: 'Payment submitted for verification' });
}));
const requestSchema = z.object({ kind: z.enum(['SPONSOR', 'BANNER']).default('SPONSOR'), headline: z.string().min(2).max(120), adText: z.string().max(300).optional(), imageUrl: z.string().max(300).optional(), mobileImageUrl: z.string().max(300).optional(),
  linkUrl: z.string().max(500).optional().refine((v) => !v || /^(https?:\/\/|\/)/.test(v), 'The link must start with https:// or /') });
r.post('/sponsor-requests', validate(requestSchema), wrap(async (req, res) => {
  const { partner, institution } = await ctx(req);
  if (partner.approval !== 'APPROVED') throw new HttpError(400, 'Your academy must be approved before you can request an ad.');
  if (await SponsorRequest.exists({ institution: institution._id, status: { $in: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PENDING_APPROVAL'] } })) throw new HttpError(409, 'You already have an ad request in progress.');
  const banner = req.body.kind === 'BANNER'; if (banner && !req.body.imageUrl) throw new HttpError(400, 'Please upload the banner image.');
  const s = await getSettings(); const fee = (banner ? s.partnerBannerFee : s.partnerSponsorFee) || 0;
  res.status(201).json(await SponsorRequest.create({ ...req.body, institution: institution._id, partner: partner._id, amount: fee, durationDays: (banner ? s.bannerDurationDays : s.sponsorDurationDays) || 30, status: fee > 0 ? 'PENDING_PAYMENT' : 'PENDING_APPROVAL' }));
}));
const mineRequest = async (req: Request) => {
  const { institution } = await ctx(req); const sr: any = await SponsorRequest.findOne({ _id: req.params.id, institution: institution._id });
  if (!sr) throw new HttpError(404, 'Request not found'); return sr;
};
r.post('/sponsor-requests/:id/pay', validate(payBody), wrap(async (req, res) => {
  const sr = await mineRequest(req);
  if (sr.status !== 'PENDING_PAYMENT') throw new HttpError(400, 'This request does not need a payment.');
  const sp = await Payment.create({ user: req.user!.id, purpose: 'SPONSORSHIP', sponsorRequest: sr._id, amount: sr.amount, transactionId: req.body.transactionId, proofKey: req.body.proofKey });
  await onPaymentSubmitted(sp); sr.status = 'PAYMENT_REVIEW'; sr.note = undefined; await sr.save(); res.status(201).json(sr);
}));
r.post('/sponsor-requests/:id/cancel', wrap(async (req, res) => {
  const sr = await mineRequest(req);
  if (sr.status !== 'PENDING_PAYMENT') throw new HttpError(400, 'Only unpaid requests can be cancelled.');
  sr.status = 'CANCELLED'; await sr.save(); res.json(sr);
}));
export default r;
