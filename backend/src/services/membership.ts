import crypto from 'crypto';
import { Membership, MembershipPlan, Notification } from '../models';
import { nextSeq } from './counter';

export function membershipView(m: any, now = new Date()) {
  if (!m) return { status: 'NONE', lifetime: false } as any;
  const lifetime = m.planKind === 'LIFETIME';
  const active = m.status === 'ACTIVE' && (lifetime || !m.expiresAt || new Date(m.expiresAt).getTime() > now.getTime());
  const status = active ? 'ACTIVE' : m.status === 'ACTIVE' ? 'EXPIRED' : m.status;
  return { status, lifetime, validUntil: lifetime ? undefined : m.expiresAt, startsAt: m.startsAt, membershipId: m.membershipId, planName: m.planName, planKind: m.planKind };
}

// Rounded public-friendly numbers: 1,234 -> "1,200+", 10,450 -> "10,000+"
export function publicCount(n: number): string {
  if (n < 10) return String(n);
  const step = n >= 10000 ? 1000 : n >= 1000 ? 100 : n >= 100 ? 50 : 10;
  return (Math.floor(n / step) * step).toLocaleString('en-IN') + '+';
}

// Called only after a payment is verified (gateway signature / webhook, or admin approval of a manual payment).
export async function activateMembership(payment: any): Promise<string> {
  const plan: any = await MembershipPlan.findById(payment.plan);
  if (!plan) return 'Payment received, but the plan no longer exists. Please contact support.';
  const m: any = (await Membership.findOne({ user: payment.user })) || new Membership({ user: payment.user });
  const now = new Date();
  const wasActive = membershipView(m, now).status === 'ACTIVE';
  if (plan.kind === 'LIFETIME') { m.expiresAt = undefined; }
  else { const base = wasActive && m.expiresAt ? new Date(m.expiresAt) : now; m.expiresAt = new Date(base.getTime() + (plan.validityDays || 365) * 864e5); } // renewal extends from the current expiry
  if (!wasActive || !m.startsAt) m.startsAt = now;
  m.status = 'ACTIVE'; m.plan = plan._id; m.planKind = plan.kind; m.planName = plan.name;
  if (!m.membershipId) m.membershipId = `TAC-${String(now.getFullYear()).slice(2)}-${String(await nextSeq('member')).padStart(6, '0')}`;
  if (!m.verifyCode) m.verifyCode = crypto.randomBytes(12).toString('hex');
  await m.save();
  const until = plan.kind === 'LIFETIME' ? 'lifetime' : `valid until ${m.expiresAt.toDateString()}`;
  const msg = `Your membership payment was successful. Member ID ${m.membershipId} (${plan.name}, ${until}). Your digital ID card is ready in My ID Card.`;
  await Notification.create({ user: payment.user, title: 'Membership activated', body: msg });
  return msg;
}
