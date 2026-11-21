import { Router } from 'express';
import { Payment } from '../../models';
import { wrap } from '../../middleware';
import { verifyWebhookSignature } from '../../services/gateway';
import { settleGatewayPayment } from '../../services/settle';

// Razorpay -> POST /api/webhooks/razorpay  (set the same URL + secret in the Razorpay dashboard; events: payment.captured, order.paid, payment.failed, refund.processed)
const r = Router();
r.post('/razorpay', wrap(async (req: any, res) => {
  if (!verifyWebhookSignature(req.rawBody, String(req.headers['x-razorpay-signature'] || ''))) return res.status(400).json({ message: 'Invalid signature' });
  const ev = req.body?.event, pay = req.body?.payload?.payment?.entity;
  if ((ev === 'payment.captured' || ev === 'order.paid') && pay?.order_id) await settleGatewayPayment(pay.order_id, pay.id, pay.amount);
  else if (ev === 'payment.failed' && pay?.order_id) await Payment.updateOne({ gatewayOrderId: pay.order_id, status: 'CREATED' }, { status: 'FAILED' });
  else if (ev === 'refund.processed' && pay?.id) await Payment.updateOne({ gatewayPaymentId: pay.id }, { status: 'REFUNDED' });
  res.json({ ok: true });
}));
export default r;
