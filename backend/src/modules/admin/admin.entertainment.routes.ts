import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Entertainment, EntertainmentBooking, Payment } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';

// Admin manages the Club Entertainment list (any number of items) and sees the bookings. Payments are approved in Admin > Payments (or from the bookings tab).
const r = Router(); r.use(authenticate, requireRole('ADMIN'));
const oid = (id: string) => { if (!isValidObjectId(id)) throw new HttpError(400, 'Invalid id'); return id; };
const schema = z.object({ title: z.string().trim().min(2).max(120), subtitle: z.string().max(160).optional(), description: z.string().max(2000).optional(), imageUrl: z.string().max(300).optional(), venue: z.string().max(160).optional(),
  eventDate: z.coerce.date().optional(), eventTime: z.string().max(40).optional(), price: z.coerce.number().min(0).default(0), capacity: z.coerce.number().int().min(0).default(0), maxPerBooking: z.coerce.number().int().min(1).max(50).default(10),
  startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional(), order: z.coerce.number().default(0), active: z.boolean().default(true) });

r.get('/entertainment', wrap(async (_req, res) => {
  const items: any[] = await Entertainment.find({ deletedAt: null }).sort('order -createdAt').lean();
  const agg: any[] = await EntertainmentBooking.aggregate([{ $match: { status: { $in: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED'] } } }, { $group: { _id: { e: '$entertainment', s: '$status' }, n: { $sum: '$qty' } } }]);
  res.json({ items: items.map((i) => { const mine = agg.filter((a) => String(a._id.e) === String(i._id)); const n = (s: string) => mine.find((a) => a._id.s === s)?.n || 0;
    return { ...i, confirmedQty: n('CONFIRMED'), pendingQty: n('PENDING_PAYMENT') + n('PAYMENT_REVIEW') }; }) });
}));
r.post('/entertainment', validate(schema), wrap(async (req, res) => { res.status(201).json(await Entertainment.create(req.body)); }));
r.put('/entertainment/:id', validate(schema.partial()), wrap(async (req, res) => { const e = await Entertainment.findOneAndUpdate({ _id: oid(req.params.id), deletedAt: null }, req.body, { new: true }); if (!e) throw new HttpError(404, 'Not found'); res.json(e); }));
r.delete('/entertainment/:id', wrap(async (req, res) => { await Entertainment.updateOne({ _id: oid(req.params.id) }, { deletedAt: new Date(), active: false }); res.json({ message: 'Removed' }); }));

r.get('/entertainment-bookings', wrap(async (req, res) => {
  const status = String(req.query.status || '');
  const items: any[] = await EntertainmentBooking.find(status ? { status } : {}).sort('-createdAt').limit(200).populate('member', 'firstName lastName phone email').lean();
  const pays: any[] = await Payment.find({ entertainmentBooking: { $in: items.map((b) => b._id) } }).sort('createdAt').lean();
  res.json({ items: items.map((b) => { const p = pays.filter((x) => String(x.entertainmentBooking) === String(b._id)).pop(); return { ...b, payment: p ? { id: p._id, status: p.status, txn: p.transactionId, hasProof: !!p.proofKey } : null }; }) });
}));
export default r;
