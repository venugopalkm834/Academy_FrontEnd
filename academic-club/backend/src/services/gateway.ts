import crypto from 'crypto';
import { HttpError } from '../middleware';

// Razorpay (INR). Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in backend/.env. Without keys only manual UPI/bank payment is offered.
const id = () => process.env.RAZORPAY_KEY_ID || '', secret = () => process.env.RAZORPAY_KEY_SECRET || '', hook = () => process.env.RAZORPAY_WEBHOOK_SECRET || '';
export const gatewayEnabled = () => !!(id() && secret());
export const gatewayKeyId = () => id();
const auth = () => 'Basic ' + Buffer.from(`${id()}:${secret()}`).toString('base64');
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const sign = (key: string, data: string | Buffer) => crypto.createHmac('sha256', key).update(data).digest('hex');

async function api(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch('https://api.razorpay.com/v1' + path, { method, headers: { authorization: auth(), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, data?.error?.description || 'The payment gateway returned an error. Please try again.');
  return data;
}
export const createOrder = (amountRupees: number, receipt: string, notes: Record<string, string>) =>
  api('POST', '/orders', { amount: Math.round(amountRupees * 100), currency: 'INR', receipt: receipt.slice(0, 40), notes });
export const fetchPayment = (paymentId: string) => api('GET', `/payments/${encodeURIComponent(paymentId)}`);
// Checkout callback: signature = HMAC_SHA256(order_id|payment_id, key_secret)
export const verifyCheckoutSignature = (orderId: string, paymentId: string, signature: string) => !!secret() && safeEq(sign(secret(), `${orderId}|${paymentId}`), String(signature));
// Webhook: signature = HMAC_SHA256(raw request body, webhook_secret)
export const verifyWebhookSignature = (raw: Buffer, signature: string) => !!hook() && !!raw && safeEq(sign(hook(), raw), String(signature));
