// Decides what a member must pay, from the admin's settings. Pure function: easy to test.
export type PayAt = 'NONE' | 'REGISTRATION' | 'BOOKING';
export interface Access {
  requiredAt: PayAt; inTrial: boolean; trialEndsAt: Date | null; daysLeft: number;
  membershipStatus: string; membershipActive: boolean; membershipId?: string; membershipExpiresAt?: Date;
  needsMembershipPayment: boolean; bookingPaymentRequired: boolean; membershipFee: number; bookingFee: number; validityDays: number;
}
export function computeAccess(s: any, m: any, now = new Date()): Access {
  const trialEnd: Date | null = m?.trialEndsAt ? new Date(m.trialEndsAt) : null;
  const inTrial = !!trialEnd && trialEnd.getTime() > now.getTime();
  const daysLeft = inTrial ? Math.ceil((trialEnd!.getTime() - now.getTime()) / 864e5) : 0;
  const active = m?.status === 'ACTIVE' && (!m.expiresAt || new Date(m.expiresAt).getTime() > now.getTime());
  const requiredAt: PayAt = s?.paymentRequiredAt || 'NONE';
  return {
    requiredAt, inTrial, trialEndsAt: trialEnd, daysLeft, membershipStatus: active ? 'ACTIVE' : m?.status === 'ACTIVE' ? 'EXPIRED' : m?.status || 'NONE', membershipActive: active,
    membershipId: m?.membershipId, membershipExpiresAt: m?.expiresAt,
    needsMembershipPayment: requiredAt === 'REGISTRATION' && !inTrial && !active,
    bookingPaymentRequired: requiredAt === 'BOOKING' && !inTrial,
    membershipFee: s?.membershipFee ?? 0, bookingFee: s?.bookingFee ?? 0, validityDays: s?.membershipValidityDays ?? 365,
  };
}

// Plan A (normal listing) for partners: free days from registration, then a paid listing verified by the admin.
export function computeListing(s: any, p: any, now = new Date()) {
  const fee: number = s?.partnerListingFee ?? 0;
  const trialEnd: Date | null = p?.trialEndsAt ? new Date(p.trialEndsAt) : null;
  const inTrial = !!trialEnd && trialEnd.getTime() > now.getTime();
  const daysLeft = inTrial ? Math.ceil((trialEnd!.getTime() - now.getTime()) / 864e5) : 0;
  const active = p?.listingStatus === 'ACTIVE' && (!p.listingExpiresAt || new Date(p.listingExpiresAt).getTime() > now.getTime());
  return {
    fee, inTrial, daysLeft, trialEndsAt: trialEnd, active, expiresAt: p?.listingExpiresAt, validityDays: s?.listingValidityDays ?? 365,
    status: active ? 'ACTIVE' : p?.listingStatus === 'ACTIVE' ? 'EXPIRED' : p?.listingStatus || 'NONE',
    needsPayment: fee > 0 && !inTrial && !active, // must pay before submitting offerings
    listed: fee <= 0 || inTrial || active,         // visible to members
  };
}
