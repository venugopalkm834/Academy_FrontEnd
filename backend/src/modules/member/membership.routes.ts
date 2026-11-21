import { Router } from 'express';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { User, Membership, MembershipPlan, Payment } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { getSettings } from '../../services/settings';
import { computeAccess } from '../../services/access';
import { membershipView, activateMembership } from '../../services/membership';
import { createOrder, fetchPayment, gatewayEnabled, gatewayKeyId, verifyCheckoutSignature } from '../../services/gateway';
import { settleGatewayPayment } from '../../services/settle';
import { cardData, cardPdf } from '../../services/idcard';
import { EDU_LEVELS, educationGroup } from '../../services/education';
import { maskAadhaar } from '../../services/aadhaar';
import { PRIVATE_DIR } from '../../config/storage';

const r = Router(); r.use(authenticate, requireRole('MEMBER'));

// ---- Profile (mobile number, email and Aadhaar cannot be changed here)
const PROFILE_FIELDS = 'firstName lastName email phone dob gender memberType address state district city pin educationLevel school aadhaarLast4 photoKey emailVerified';
r.get('/profile', wrap(async (req, res) => {
  const u: any = await User.findById(req.user!.id).select(PROFILE_FIELDS).lean();
  res.json({ ...u, fullName: [u.firstName, u.lastName].filter(Boolean).join(' '), aadhaarMasked: maskAadhaar(u.aadhaarLast4), aadhaarLast4: undefined, hasPhoto: !!u.photoKey, photoKey: undefined });
}));
const EDU = EDU_LEVELS.map((e) => e.value) as [string, ...string[]];
r.put('/profile', validate(z.object({
  fullName: z.string().trim().min(2).max(80), memberType: z.enum(['STUDENT', 'PARENT']), gender: z.enum(['MALE', 'FEMALE', 'OTHER']), dob: z.coerce.date().max(new Date()),
  address: z.string().trim().min(5).max(300), state: z.string().trim().min(2).max(60), district: z.string().trim().min(2).max(60), city: z.string().trim().min(2).max(60),
  pin: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'), educationLevel: z.enum(EDU), school: z.string().max(120).optional(), photoKey: z.string().regex(/^[0-9a-f-]{36}\.(jpe?g|png)$/).optional(),
})), wrap(async (req, res) => {
  const { fullName, educationLevel, ...rest } = req.body; const [first, ...last] = fullName.split(/\s+/);
  await User.updateOne({ _id: req.user!.id }, { ...rest, educationLevel, qualification: educationLevel, educationGroup: educationGroup(educationLevel), firstName: first, lastName: last.join(' ') });
  res.json({ message: 'Profile updated' });
}));
r.get('/photo', wrap(async (req, res) => {
  const u: any = await User.findById(req.user!.id).select('photoKey'); if (!u?.photoKey) throw new HttpError(404, 'No photo');
  res.sendFile(path.join(PRIVATE_DIR, path.basename(u.photoKey)));
}));

// ---- Plans + payment (membership and payment are separate steps: registration first, then pay)
const planFor = async (uid: string, planId: string) => {
  const [u, m]: any[] = await Promise.all([User.findById(uid).select('educationGroup'), Membership.findOne({ user: uid }).lean()]);
  const plan: any = await MembershipPlan.findOne({ _id: planId, active: true, educationGroup: { $in: ['ANY', u?.educationGroup || 'ANY'] } });
  if (!plan) throw new HttpError(404, 'This plan is not available for you.');
  if (membershipView(m).status === 'ACTIVE' && membershipView(m).lifetime) throw new HttpError(400, 'You already have a lifetime membership.');
  return plan;
};
r.get('/plans', wrap(async (req, res) => {
  const u: any = await User.findById(req.user!.id).select('educationGroup'); const [s, m]: any[] = await Promise.all([getSettings(), Membership.findOne({ user: req.user!.id }).lean()]);
  const plans = await MembershipPlan.find({ active: true, educationGroup: { $in: ['ANY', u?.educationGroup || 'ANY'] } }).sort('order price').lean();
  res.json({ view: membershipView(m), access: computeAccess(s, m), plans, group: u?.educationGroup, gateway: { enabled: gatewayEnabled(), keyId: gatewayEnabled() ? gatewayKeyId() : undefined } });
}));
// Online payment, step 1: create an order. Nothing is activated yet.
r.post('/membership/checkout', validate(z.object({ planId: z.string() })), wrap(async (req, res) => {
  const plan = await planFor(req.user!.id, req.body.planId);
  if (plan.price <= 0) { // free plan: activate straight away
    const p: any = await Payment.create({ user: req.user!.id, purpose: 'MEMBERSHIP', plan: plan._id, amount: 0, method: 'GATEWAY', status: 'APPROVED', transactionId: 'FREE-' + crypto.randomUUID(), paidAt: new Date() });
    return res.json({ free: true, message: await activateMembership(p) });
  }
  if (!gatewayEnabled()) throw new HttpError(400, 'Online payment is not set up yet. Please use the manual UPI / bank option.');
  const payment: any = new Payment({ user: req.user!.id, purpose: 'MEMBERSHIP', plan: plan._id, amount: plan.price, method: 'GATEWAY', status: 'CREATED', transactionId: 'PENDING-' + crypto.randomUUID() });
  const order = await createOrder(plan.price, String(payment._id), { purpose: 'MEMBERSHIP', user: String(req.user!.id), plan: String(plan._id) });
  payment.gatewayOrderId = order.id; payment.transactionId = order.id; await payment.save();
  const u: any = await User.findById(req.user!.id).select('firstName lastName email phone');
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: gatewayKeyId(), planName: plan.name, prefill: { name: [u.firstName, u.lastName].join(' ').trim(), email: u.email, contact: u.phone } });
}));
// Step 2: the browser reports the result, but we trust only the signed result + the gateway's own record (the webhook is the backup).
r.post('/membership/verify', validate(z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() })), wrap(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: payId, razorpay_signature: sig } = req.body;
  const p: any = await Payment.findOne({ gatewayOrderId: orderId, user: req.user!.id, purpose: 'MEMBERSHIP' });
  if (!p) throw new HttpError(404, 'Order not found');
  if (p.status === 'APPROVED') return res.json({ message: 'Payment already confirmed.' });
  if (!verifyCheckoutSignature(orderId, payId, sig)) { await Payment.updateOne({ _id: p._id, status: 'CREATED' }, { status: 'FAILED' }); throw new HttpError(400, 'Payment verification failed.'); }
  const gp = await fetchPayment(payId);
  if (gp.order_id !== orderId || gp.status !== 'captured') throw new HttpError(402, 'Your payment is not confirmed yet. If money was deducted, your membership will activate automatically within a few minutes.');
  const r2 = await settleGatewayPayment(orderId, payId, gp.amount);
  res.json({ message: r2.message || 'Payment confirmed.' });
}));
// Manual UPI / bank payment: the admin verifies it
r.post('/membership/pay-manual', validate(z.object({ planId: z.string(), transactionId: z.string().trim().min(6, 'Enter the transaction / UTR ID').max(40), proofKey: z.string().regex(/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/, 'Please upload your payment screenshot') })), wrap(async (req, res) => {
  const plan = await planFor(req.user!.id, req.body.planId);
  if (await Payment.exists({ user: req.user!.id, purpose: 'MEMBERSHIP', status: 'UNDER_REVIEW' })) throw new HttpError(409, 'Your previous payment is still under review.');
  const p = await Payment.create({ user: req.user!.id, purpose: 'MEMBERSHIP', plan: plan._id, amount: plan.price, method: 'MANUAL', status: 'UNDER_REVIEW', transactionId: req.body.transactionId, proofKey: req.body.proofKey });
  await Membership.updateOne({ user: req.user!.id, status: { $ne: 'ACTIVE' } }, { status: 'PENDING' }, { upsert: true });
  res.status(201).json(p);
}));

// ---- ID card (generated only after a verified payment gave the member a Member ID)
r.get('/id-card', wrap(async (req, res) => {
  const c = await cardData(req.user!.id); if (!c) throw new HttpError(404, 'Your ID card is created automatically after your membership payment is verified.');
  res.json(c);
}));
r.get('/id-card.pdf', wrap(async (req, res) => {
  const c = await cardData(req.user!.id); if (!c) throw new HttpError(404, 'Your ID card is created automatically after your membership payment is verified.');
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="Academic-Club-ID-${c.memberId}.pdf"`).send(await cardPdf(c));
}));
export default r;
