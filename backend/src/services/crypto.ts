import crypto from 'crypto';
import { env } from '../config/env';
const key = () => Buffer.from(env.aadhaarKey, 'hex');
// AES-256-GCM: authenticated encryption for sensitive identity data
export const encrypt = (plain: string) => {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
};
export const decrypt = (blob: string) => {
  const [iv, tag, enc] = blob.split('.').map((p) => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
};
export const keyedHash = (plain: string) => crypto.createHmac('sha256', key()).update(plain).digest('hex');
