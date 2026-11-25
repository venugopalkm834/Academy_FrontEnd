import { Router } from 'express';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { User, Partner, Institution, Course, Sponsor, Notification, Banner, EntertainmentBooking, AdminSettings, Payment, Membership, Booking, SponsorRequest } from '../../models';
import { getSettings } from '../../services/settings';
import { activateMembership } from '../../services/membership';
import { onPaymentApproved, onPaymentRejected, onBookingConfirmed, onEntertainmentConfirmed } from '../../services/events';
import { resendConfigured } from '../../services/mail';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { applyPrice } from '../../services/course-pricing';
import { sendMail } from '../../services/mail';
import { PRIVATE_DIR } from '../upload/upload.routes';

const r = Router(); r.use(authenticate, requireRole('ADMIN'));
const oid = (id: string) => { if (!isValidObjectId(id)) throw new HttpError(400, 'Invalid id'); return id; };
// Approving a sponsorship request turns it into a live Sponsor (ad); rejecting lets the partner pay again (or ends a free request).
async function decideSponsorRequest(sr: any, approve: boolean, reason: string) {
  if (approve) {
    const now = new Date(), end = new Date(now.getTime() + (sr.durationDays || 30) * 864e5);
    if (sr.kind === 'BANNER') {
      const bn: any = await Banner.create({ title: sr.headline, imageUrl: sr.imageUrl, mobileImageUrl: sr.mobileImageUrl, linkUrl: sr.linkUrl, placement: 'ALL', startsAt: now, expiresAt: end, active: true });
      sr.status = 'ACTIVE'; sr.banner = bn._id; sr.note = undefined; await sr.save();
      return `Your banner ad is approved and live until ${end.toDateString()}.`;
    }
    const sp: any = await Sponsor.create({ institution: sr.institution, headline: sr.headline, adText: sr.adText, imageUrl: sr.imageUrl, startsAt: now, expiresAt: end, active: true });
    sr.status = 'ACTIVE'; sr.sponsor = sp._id; sr.note = undefined; await sr.save();
    return `Your sponsorship is approved and live on the main page until ${end.toDateString()}.`;
  }
  sr.status = sr.amount > 0 ? 'PENDING_PAYMENT' : 'REJECTED'; sr.note = reason; await sr.save();
  return `Your sponsorship request was not approved: ${reason}.${sr.amount > 0 ? ' You can pay again.' : ''}`;
}
const notify = async (user: any, title: string, body: string) => { await Notification.create({ user, title, body }); };


// ---- Partners
r.get('/partners', wrap(async (req, res) => {
  const want = String(req.query.status || '');
  const partners: any[] = await Partner.find({ deletedAt: null }).sort('-createdAt').populate('user', 'email phone status createdAt').lean();
  const insts: any[] = await Institution.find({ partner: { $in: partners.map((p) => p._id) } }).lean();
  const items = partners.map((p) => ({ id: p._id, state: p.user?.status === 'SUSPENDED' ? 'SUSPENDED' : p.approval, rejectionReason: p.rejectionReason, hasDocument: !!p.registrationDocKey, contactName: p.contactName,
    email: p.user?.email, phone: p.user?.phone, registeredAt: p.createdAt, institution: insts.find((i) => String(i.partner) === String(p._id)) }));
  res.json({ items: want ? items.filter((x) => x.state === want) : items });
}));
r.put('/partners/:id/status', validate(z.object({ action: z.enum(['approve', 'reject', 'suspend', 'reactivate']), reason: z.string().max(300).optional() })), wrap(async (req, res) => {
  const p = await Partner.findById(oid(req.params.id)); if (!p) throw new HttpError(404, 'Partner not found');
  const u = await User.findById(p.user); if (!u) throw new HttpError(404, 'User not found');
  const { action, reason } = req.body;
  if (action === 'approve') { p.approval = 'APPROVED'; p.rejectionReason = undefined; p.approvedBy = req.user!.id as any; p.approvedAt = new Date(); u.status = 'ACTIVE'; }
  if (action === 'reject') { p.approval = 'REJECTED'; p.rejectionReason = reason || 'Not specified'; }
  if (action === 'suspend') u.status = 'SUSPENDED';
  if (action === 'reactivate') u.status = 'ACTIVE';
  await p.save(); await u.save();
  const msg = ({ approve: 'Your institution has been approved. You can now submit offerings.', reject: `Your registration was not approved: ${reason || ''}`, suspend: 'Your account has been suspended.', reactivate: 'Your account has been reactivated.' } as Record<string, string>)[action];
  await notify(u._id, 'Account update', msg); sendMail(u.email, 'The Academic Club: account update', `<p>${msg}</p>`).catch(() => {});
  res.json({ message: 'Updated' });
}));
r.get('/partners/:id/document', wrap(async (req, res) => {
  const p = await Partner.findById(oid(req.params.id)); if (!p?.registrationDocKey) throw new HttpError(404, 'No document uploaded');
  res.sendFile(path.join(PRIVATE_DIR, path.basename(p.registrationDocKey)));
}));

// ---- Offerings (courses) review
r.get('/courses', wrap(async (req, res) => {
  const status = String(req.query.status || '');
  const items = await Course.find({ deletedAt: null, ...(status ? { status } : {}) }).sort('-updatedAt').populate('institution', 'name type city').limit(200);
  res.json({ items });
}));
r.put('/courses/:id/review', validate(z.object({ action: z.enum(['approve', 'reject', 'deactivate']), clubDiscountPct: z.coerce.number().min(0).max(100).optional(), reason: z.string().max(300).optional() })), wrap(async (req, res) => {
  const c = await Course.findById(oid(req.params.id)); if (!c) throw new HttpError(404, 'Offering not found');
  const inst = await Institution.findById(c.institution); const partner = inst?.partner && (await Partner.findById(inst.partner));
  const { action, clubDiscountPct, reason } = req.body;
  if (action === 'approve') {
    if (partner && partner.approval !== 'APPROVED') throw new HttpError(400, 'Approve the partner first');
    c.status = 'APPROVED'; c.rejectionReason = undefined; if (clubDiscountPct !== undefined) c.clubDiscountPct = clubDiscountPct; await applyPrice(c);
  }
  if (action === 'reject') { c.status = 'REJECTED'; c.rejectionReason = reason || 'Not specified'; }
  if (action === 'deactivate') c.status = 'INACTIVE';
  await c.save();
  if (partner) await notify(partner.user, 'Offering update', `"${c.name}" is now ${c.status}${action === 'reject' ? ': ' + c.rejectionReason : ''}.`);
  res.json(c);
}));

// ---- Sponsors / ads
r.get('/institutions', wrap(async (_req, res) => {
  const ok = await Partner.find({ approval: 'APPROVED' }).distinct('_id');
  res.json({ items: await Institution.find({ deletedAt: null, $or: [{ partner: { $in: ok } }, { partner: null }] }).select('name type city').sort('name') });
}));
const sponsorSchema = z.object({ institutionId: z.string(), headline: z.string().min(2).max(120), adText: z.string().max(300).optional(), imageUrl: z.string().max(300).optional(),
  startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional(), order: z.coerce.number().default(0), active: z.boolean().default(true) });
r.get('/sponsors', wrap(async (_req, res) => { res.json({ items: await Sponsor.find().sort('order -createdAt').populate('institution', 'name type city logoUrl') }); }));
r.post('/sponsors', validate(sponsorSchema), wrap(async (req, res) => {
  const { institutionId, ...rest } = req.body; const inst = await Institution.findById(oid(institutionId)); if (!inst) throw new HttpError(404, 'Institution not found');
  const partner = inst.partner && (await Partner.findById(inst.partner)); if (partner && partner.approval !== 'APPROVED') throw new HttpError(400, 'Only approved partners can be sponsors');
  res.status(201).json(await Sponsor.create({ ...rest, institution: inst._id }));
}));
r.put('/sponsors/:id', validate(sponsorSchema.partial()), wrap(async (req, res) => {
  const { institutionId, ...rest } = req.body; const s = await Sponsor.findByIdAndUpdate(oid(req.params.id), { ...rest, ...(institutionId ? { institution: institutionId } : {}) }, { new: true });
  if (!s) throw new HttpError(404, 'Sponsor not found'); res.json(s);
}));
r.delete('/sponsors/:id', wrap(async (req, res) => { await Sponsor.findByIdAndDelete(oid(req.params.id)); res.json({ message: 'Deleted' }); }));

// ---- Payment settings (free days, when payment is required, fees, QR / bank details)
const txt = z.string().max(120).optional();
const settingsSchema = z.object({
  paymentRequiredAt: z.enum(['NONE', 'REGISTRATION', 'BOOKING']), freeTrialDays: z.coerce.number().int().min(0).max(3650),
  membershipFee: z.coerce.number().min(0), membershipValidityDays: z.coerce.number().int().min(1).max(3650), bookingFee: z.coerce.number().min(0),
  partnerFreeDays: z.coerce.number().int().min(0).max(3650), partnerListingFee: z.coerce.number().min(0), listingValidityDays: z.coerce.number().int().min(1).max(3650),
  partnerBannerFee: z.coerce.number().min(0), bannerDurationDays: z.coerce.number().int().min(1).max(3650), partnerSponsorFee: z.coerce.number().min(0), sponsorDurationDays: z.coerce.number().int().min(1).max(3650),
  requireAadhaar: z.boolean().optional(), statsMembersOverride: z.coerce.number().int().min(0).optional(), statsInstitutesOverride: z.coerce.number().int().min(0).optional(),
  upiId: txt, upiQrUrl: z.string().max(300).optional(), showQr: z.boolean(), showBank: z.boolean(), paymentInstructions: z.string().max(1000).optional(),
  bank: z.object({ accountName: txt, bankName: txt, accountNumber: txt, ifsc: txt, branch: txt }).optional(),
});
r.get('/settings', wrap(async (_req, res) => { res.json(await getSettings()); }));
r.put('/settings', validate(settingsSchema), wrap(async (req, res) => {
  const b = req.body;
  const anyFee = b.paymentRequiredAt !== 'NONE' || b.partnerListingFee > 0 || b.partnerSponsorFee > 0 || b.partnerBannerFee > 0;
  if (anyFee) {
    const hasDetails = !!b.upiId || (b.showQr && !!b.upiQrUrl) || (b.showBank && !!b.bank?.accountNumber);
    if (!hasDetails) throw new HttpError(400, 'Add payment details first (UPI ID, QR code or bank account) so members know where to pay.');
    if (b.paymentRequiredAt === 'REGISTRATION' && !(b.membershipFee > 0)) throw new HttpError(400, 'Set a membership fee above 0.');
    if (b.paymentRequiredAt === 'BOOKING' && !(b.bookingFee > 0)) throw new HttpError(400, 'Set a booking fee above 0.');
  }
  res.json(await AdminSettings.findOneAndUpdate({ key: 'global' }, { $set: b }, { upsert: true, new: true }));
}));

// ---- Payments to verify manually
r.get('/payments/:id/proof', wrap(async (req, res) => {
  const p = await Payment.findById(oid(req.params.id)); if (!p?.proofKey) throw new HttpError(404, 'No screenshot uploaded');
  res.sendFile(path.join(PRIVATE_DIR, path.basename(p.proofKey)));
}));
r.put('/payments/:id/review', validate(z.object({ action: z.enum(['approve', 'reject']), reason: z.string().max(300).optional() })), wrap(async (req, res) => {
  const p = await Payment.findById(oid(req.params.id)); if (!p) throw new HttpError(404, 'Payment not found');
  if (p.status !== 'UNDER_REVIEW') throw new HttpError(400, 'This payment was already reviewed.');
  const approve = req.body.action === 'approve'; const reason = req.body.reason || 'Payment could not be verified';
  p.status = approve ? 'APPROVED' : 'REJECTED'; p.rejectionReason = approve ? undefined : reason; p.reviewedBy = req.user!.id as any; p.reviewedAt = new Date(); await p.save();
  let msg = '';
  if (p.purpose === 'MEMBERSHIP') {
    if (approve) msg = await activateMembership(p);
    else { await Membership.updateOne({ user: p.user, status: { $ne: 'ACTIVE' } }, { status: 'NONE' }); msg = `Your membership payment was rejected: ${reason}. Please pay again.`; }
  } else if (p.purpose === 'LISTING') {
    const s = await getSettings(); const pt: any = await Partner.findOne({ user: p.user });
    if (pt) {
      if (approve) { pt.listingStatus = 'ACTIVE'; pt.listingExpiresAt = new Date(Date.now() + (s.listingValidityDays || 365) * 864e5); msg = `Your listing payment was approved. You can now submit offerings. Listing valid until ${pt.listingExpiresAt.toDateString()}.`; }
      else { pt.listingStatus = 'NONE'; msg = `Your listing payment was rejected: ${reason}. Please pay again.`; }
      await pt.save();
    }
  } else if (p.purpose === 'SPONSORSHIP') {
    const sr: any = await SponsorRequest.findById(p.sponsorRequest); if (sr) msg = await decideSponsorRequest(sr, approve, reason);
  } else if (p.purpose === 'ENTERTAINMENT') {
    const eb: any = await EntertainmentBooking.findById(p.entertainmentBooking);
    if (eb) { eb.status = approve ? 'CONFIRMED' : 'PENDING_PAYMENT'; eb.paymentNote = approve ? undefined : reason; await eb.save();
      msg = approve ? `Your booking ${eb.bookingNo} for ${eb.snapshot?.title} is confirmed.` : `Payment for booking ${eb.bookingNo} was rejected: ${reason}. Please pay again.`; }
  } else {
    const b = await Booking.findById(p.booking);
    if (b) { b.status = approve ? 'CONFIRMED' : 'PENDING_PAYMENT'; b.paymentNote = approve ? undefined : reason; await b.save();
      msg = approve ? `Your booking ${b.bookingNo} is confirmed.` : `Payment for booking ${b.bookingNo} was rejected: ${reason}. Please pay again.`; }
  }
  await notify(p.user, 'Payment update', msg);
  if (approve) { await onPaymentApproved(p); if (p.purpose === 'BOOKING') { const b = await Booking.findById(p.booking); if (b) await onBookingConfirmed(b); }
    if (p.purpose === 'ENTERTAINMENT') { const eb = await EntertainmentBooking.findById(p.entertainmentBooking); if (eb) await onEntertainmentConfirmed(eb); } }
  else await onPaymentRejected(p, reason);
  res.json(p);
}));

// ---- Sponsorship requests from partners (Plan B)
r.get('/sponsor-requests', wrap(async (_req, res) => {
  const items: any[] = await SponsorRequest.find().sort('-createdAt').limit(200).populate('institution', 'name type city logoUrl').lean();
  const pays: any[] = await Payment.find({ purpose: 'SPONSORSHIP', sponsorRequest: { $in: items.map((i) => i._id) } }).sort('createdAt').lean();
  res.json({ items: items.map((i) => { const p = pays.filter((x) => String(x.sponsorRequest) === String(i._id)).pop(); return { ...i, payment: p ? { id: p._id, txn: p.transactionId, status: p.status, hasProof: !!p.proofKey } : null }; }) });
}));
r.put('/sponsor-requests/:id/review', validate(z.object({ action: z.enum(['approve', 'reject']), reason: z.string().max(300).optional() })), wrap(async (req, res) => {
  const sr: any = await SponsorRequest.findById(oid(req.params.id)); if (!sr) throw new HttpError(404, 'Request not found');
  if (!['PAYMENT_REVIEW', 'PENDING_APPROVAL'].includes(sr.status)) throw new HttpError(400, 'This request cannot be reviewed now.');
  const approve = req.body.action === 'approve', reason = req.body.reason || 'Not specified';
  const pay: any = await Payment.findOne({ sponsorRequest: sr._id, status: 'UNDER_REVIEW' });
  if (pay) { pay.status = approve ? 'APPROVED' : 'REJECTED'; pay.rejectionReason = approve ? undefined : reason; pay.reviewedBy = req.user!.id; pay.reviewedAt = new Date(); await pay.save(); }
  const msg = await decideSponsorRequest(sr, approve, reason);
  const pt: any = await Partner.findById(sr.partner); if (pt) await notify(pt.user, 'Sponsorship update', msg);
  res.json(sr);
}));

// ---- Banners (image ads on the home page / member panel)
const url = z.string().max(500).refine((v) => !v || /^(https?:\/\/|\/)/.test(v), 'The link must start with https:// or /');
const bannerSchema = z.object({ title: z.string().max(120).optional(), imageUrl: z.string().min(1).max(300), mobileImageUrl: z.string().max(300).optional(), linkUrl: url.optional(),
  placement: z.enum(['ALL', 'HOME', 'MEMBER']).default('ALL'), startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional(), order: z.coerce.number().default(0), active: z.boolean().default(true) });
r.get('/banners', wrap(async (_req, res) => { res.json({ items: await Banner.find().sort('order -createdAt').lean() }); }));
r.post('/banners', validate(bannerSchema), wrap(async (req, res) => { res.status(201).json(await Banner.create(req.body)); }));
r.put('/banners/:id', validate(bannerSchema.partial()), wrap(async (req, res) => { const b = await Banner.findByIdAndUpdate(oid(req.params.id), req.body, { new: true }); if (!b) throw new HttpError(404, 'Banner not found'); res.json(b); }));
r.delete('/banners/:id', wrap(async (req, res) => { await Banner.findByIdAndDelete(oid(req.params.id)); res.json({ message: 'Deleted' }); }));

// ---- Contact details + email sender (shown in the site, member and academy panels)
const optMail = z.string().email().or(z.literal('')).optional();
const siteSchema = z.object({ contactEmail: optMail, whatsapp: z.string().regex(/^[+\d\s-]{0,16}$/, 'WhatsApp number: digits only, with country code if outside India').optional(), contactPhone: z.string().max(20).optional(),
  address: z.string().max(400).optional(), workingHours: z.string().max(120).optional(), whatsappMessage: z.string().max(200).optional(), emailFrom: z.string().max(160).optional(), notifyEmail: optMail });
r.get('/site', wrap(async (_req, res) => { const s = await getSettings(); res.json({ ...(s.site || {}), emailFrom: s.emailFrom || '', notifyEmail: s.notifyEmail || '', resendConfigured: resendConfigured() }); }));
r.put('/site', validate(siteSchema), wrap(async (req, res) => {
  const { emailFrom, notifyEmail, ...site } = req.body; const set: any = {};
  for (const [k, v] of Object.entries(site)) set[`site.${k}`] = v;
  if (emailFrom !== undefined) set.emailFrom = emailFrom; if (notifyEmail !== undefined) set.notifyEmail = notifyEmail;
  await AdminSettings.findOneAndUpdate({ key: 'global' }, { $set: set }, { upsert: true }); res.json({ message: 'Saved' });
}));
export default r;
