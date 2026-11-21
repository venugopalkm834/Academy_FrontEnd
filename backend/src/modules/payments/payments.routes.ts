import { Router } from 'express';
import { authenticate, requireRole, wrap } from '../../middleware';
import { getSettings } from '../../services/settings';

// Payment details shown to anyone who has to pay (members and partners). Fees + QR / UPI / bank details come from the admin's settings.
const r = Router(); r.use(authenticate, requireRole('MEMBER', 'PARTNER'));
r.get('/info', wrap(async (_req, res) => {
  const s = await getSettings();
  res.json({ requiredAt: s.paymentRequiredAt, membershipFee: s.membershipFee, bookingFee: s.bookingFee, validityDays: s.membershipValidityDays,
    partnerListingFee: s.partnerListingFee, partnerSponsorFee: s.partnerSponsorFee, sponsorDurationDays: s.sponsorDurationDays, listingValidityDays: s.listingValidityDays,
    upiId: s.upiId, upiQrUrl: s.showQr ? s.upiQrUrl : undefined, bank: s.showBank ? s.bank : undefined, instructions: s.paymentInstructions });
}));
export default r;
