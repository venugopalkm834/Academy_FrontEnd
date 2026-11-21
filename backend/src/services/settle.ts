import { Payment } from '../models';
import { HttpError } from '../middleware';
import { activateMembership } from './membership';

// Marks a gateway payment successful exactly once (atomic status change), then applies its effects. Safe to call from both the
// checkout callback and the webhook: whichever arrives second does nothing.
export async function settleGatewayPayment(orderId: string, paymentId: string, amountPaise?: number): Promise<{ done: boolean; message?: string }> {
  const cur: any = await Payment.findOne({ gatewayOrderId: orderId });
  if (!cur) return { done: false };
  if (amountPaise !== undefined && amountPaise !== Math.round(cur.amount * 100)) throw new HttpError(400, 'Paid amount does not match the order');
  const p: any = await Payment.findOneAndUpdate({ _id: cur._id, status: { $in: ['CREATED', 'FAILED'] } }, { status: 'APPROVED', gatewayPaymentId: paymentId, paidAt: new Date() }, { new: true });
  if (!p) return { done: false, message: 'already processed' };
  if (p.purpose === 'MEMBERSHIP') return { done: true, message: await activateMembership(p) };
  return { done: true };
}
