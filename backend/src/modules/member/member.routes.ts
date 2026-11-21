import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Membership, Payment, Booking, Course, Institution } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { getSettings } from '../../services/settings';
import { computeAccess } from '../../services/access';

const r = Router(); r.use(authenticate, requireRole('MEMBER'));
const state = async (uid: string) => {
  const [s, m]: any[] = await Promise.all([getSettings(), Membership.findOne({ user: uid }).lean()]);
  return { s, m, access: computeAccess(s, m) };
};
const payBody = z.object({ transactionId: z.string().trim().min(6, 'Enter the transaction / UTR ID').max(40), proofKey: z.string().regex(/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/, 'Please upload your payment screenshot') });

r.get('/access', wrap(async (req, res) => { res.json((await state(req.user!.id)).access); }));
r.get('/payment-info', wrap(async (_req, res) => {
  const s = await getSettings();
  res.json({ requiredAt: s.paymentRequiredAt, membershipFee: s.membershipFee, bookingFee: s.bookingFee, validityDays: s.membershipValidityDays, upiId: s.upiId,
    upiQrUrl: s.showQr ? s.upiQrUrl : undefined, bank: s.showBank ? s.bank : undefined, instructions: s.paymentInstructions });
}));
r.get('/payments', wrap(async (req, res) => { res.json({ items: await Payment.find({ user: req.user!.id }).sort('-createdAt').select('-proofKey') }); }));

// ---- Bookings
const bookingNo = () => 'BK' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
r.post('/bookings', validate(z.object({ courseId: z.string(), note: z.string().max(300).optional() })), wrap(async (req, res) => {
  const uid = req.user!.id; const { s, access } = await state(uid);
  if (access.needsMembershipPayment) throw new HttpError(402, 'Membership payment is required before you can book.');
  const course: any = await Course.findOne({ _id: req.body.courseId, status: 'APPROVED', deletedAt: null });
  const inst = course && (await Institution.findOne({ _id: course.institution, active: true, deletedAt: null }));
  if (!course || !inst) throw new HttpError(404, 'This offering is no longer available.');
  if (await Booking.exists({ member: uid, course: course._id, status: { $ne: 'CANCELLED' } })) throw new HttpError(409, 'You have already booked this offering.');
  const fee = access.bookingPaymentRequired ? s.bookingFee || 0 : 0;
  const b = await Booking.create({ bookingNo: bookingNo(), member: uid, course: course._id, institution: inst._id, note: req.body.note, amount: fee,
    snapshot: { courseName: course.name, originalFee: course.originalFee, finalFee: course.finalFee }, status: fee > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED' });
  res.status(201).json(b);
}));
r.get('/bookings', wrap(async (req, res) => {
  const items: any[] = await Booking.find({ member: req.user!.id }).sort('-createdAt').populate('institution', 'name city contactPhone type').lean();
  const pays: any[] = await Payment.find({ booking: { $in: items.map((b) => b._id) } }).sort('createdAt').lean();
  res.json({ items: items.map((b) => ({ ...b, payment: pays.filter((p) => String(p.booking) === String(b._id)).pop() })) });
}));
const mine = async (req: any) => { const b = await Booking.findOne({ _id: req.params.id, member: req.user.id }); if (!b) throw new HttpError(404, 'Booking not found'); return b; };
r.post('/bookings/:id/pay', validate(payBody), wrap(async (req, res) => {
  const b = await mine(req);
  if (b.status !== 'PENDING_PAYMENT') throw new HttpError(400, 'This booking does not need a payment.');
  await Payment.create({ user: req.user!.id, purpose: 'BOOKING', booking: b._id, amount: b.amount, transactionId: req.body.transactionId, proofKey: req.body.proofKey });
  b.status = 'PAYMENT_REVIEW'; b.paymentNote = undefined; await b.save(); res.status(201).json(b);
}));
r.post('/bookings/:id/cancel', wrap(async (req, res) => {
  const b = await mine(req);
  if (b.status !== 'PENDING_PAYMENT') throw new HttpError(400, 'Only unpaid bookings can be cancelled here.');
  b.status = 'CANCELLED'; await b.save(); res.json(b);
}));
export default r;
