import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Entertainment, EntertainmentBooking, Membership, Payment } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { getSettings } from '../../services/settings';
import { computeAccess } from '../../services/access';
import { onEntertainmentCreated, onEntertainmentConfirmed, onPaymentSubmitted } from '../../services/events';

const r = Router(); r.use(authenticate, requireRole('MEMBER'));
const HOLD = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED'];
const reserved = async (id: any) => { const a: any[] = await EntertainmentBooking.aggregate([{ $match: { entertainment: id, status: { $in: HOLD } } }, { $group: { _id: null, n: { $sum: '$qty' } } }]); return a[0]?.n || 0; };
const payBody = z.object({ transactionId: z.string().trim().min(6, 'Enter the transaction / UTR ID').max(40), proofKey: z.string().regex(/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/, 'Please upload your payment screenshot') });

r.post('/entertainment/bookings', validate(z.object({ entertainmentId: z.string(), qty: z.coerce.number().int().min(1).max(50).default(1) })), wrap(async (req, res) => {
  const uid = req.user!.id; const [s, m]: any[] = await Promise.all([getSettings(), Membership.findOne({ user: uid }).lean()]);
  if (computeAccess(s, m).needsMembershipPayment) throw new HttpError(402, 'Membership payment is required before you can book.');
  const ev: any = await Entertainment.findOne({ _id: req.body.entertainmentId, active: true, deletedAt: null }); const now = new Date(); const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!ev || (ev.startsAt && ev.startsAt > now) || (ev.expiresAt && ev.expiresAt < now) || (ev.eventDate && ev.eventDate < today)) throw new HttpError(404, 'This event is no longer available.');
  const qty = req.body.qty; if (qty > ev.maxPerBooking) throw new HttpError(400, `You can book up to ${ev.maxPerBooking} tickets at a time.`);
  if (ev.capacity > 0) { const left = ev.capacity - (await reserved(ev._id)); if (qty > left) throw new HttpError(409, left > 0 ? `Only ${left} seat(s) left.` : 'Sorry, this event is sold out.'); }
  const amount = Math.round(ev.price * qty * 100) / 100;
  const b: any = await EntertainmentBooking.create({ bookingNo: 'CE' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(), member: uid, entertainment: ev._id, qty, amount,
    snapshot: { title: ev.title, eventDate: ev.eventDate, eventTime: ev.eventTime, venue: ev.venue, price: ev.price }, status: amount > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED' });
  if (ev.capacity > 0 && (await reserved(ev._id)) > ev.capacity) { await EntertainmentBooking.deleteOne({ _id: b._id }); throw new HttpError(409, 'Sorry, the last seats were just taken.'); } // two people booking at the same moment
  await onEntertainmentCreated(b); if (b.status === 'CONFIRMED') await onEntertainmentConfirmed(b);
  res.status(201).json(b);
}));
r.get('/entertainment/bookings', wrap(async (req, res) => {
  const items: any[] = await EntertainmentBooking.find({ member: req.user!.id }).sort('-createdAt').lean();
  const pays: any[] = await Payment.find({ entertainmentBooking: { $in: items.map((b) => b._id) } }).sort('createdAt').lean();
  res.json({ items: items.map((b) => ({ ...b, payment: pays.filter((p) => String(p.entertainmentBooking) === String(b._id)).pop() })) });
}));
const mine = async (req: any) => { const b: any = await EntertainmentBooking.findOne({ _id: req.params.id, member: req.user.id }); if (!b) throw new HttpError(404, 'Booking not found'); return b; };
r.post('/entertainment/bookings/:id/pay', validate(payBody), wrap(async (req, res) => {
  const b = await mine(req); if (b.status !== 'PENDING_PAYMENT') throw new HttpError(400, 'This booking does not need a payment.');
  const p = await Payment.create({ user: req.user!.id, purpose: 'ENTERTAINMENT', entertainmentBooking: b._id, amount: b.amount, transactionId: req.body.transactionId, proofKey: req.body.proofKey });
  await onPaymentSubmitted(p); b.status = 'PAYMENT_REVIEW'; b.paymentNote = undefined; await b.save(); res.status(201).json(b);
}));
r.post('/entertainment/bookings/:id/cancel', wrap(async (req, res) => {
  const b = await mine(req); if (b.status !== 'PENDING_PAYMENT') throw new HttpError(400, 'Only unpaid bookings can be cancelled here.');
  b.status = 'CANCELLED'; await b.save(); res.json(b);
}));
export default r;
