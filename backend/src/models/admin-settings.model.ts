import { Schema, model } from 'mongoose';
import { S, T } from './_helpers';

export const AdminSettings = model('AdminSettings', new Schema({
  key: { type: String, default: 'global', unique: true },
  // When is payment required from members? NONE | REGISTRATION (membership fee) | BOOKING (fee when booking a course)
  paymentRequiredAt: { type: String, enum: ['NONE', 'REGISTRATION', 'BOOKING'], default: 'NONE' },
  freeTrialDays: { type: Number, min: 0, default: 7 }, // free days from the member's registration
  membershipFee: { type: Number, min: 0, default: 999 }, membershipValidityDays: { type: Number, min: 1, default: 365 }, membershipBenefits: [String],
  bookingFee: { type: Number, min: 0, default: 0 },
  // Partners: Plan A normal listing (free days, fee, validity) and Plan B featured sponsorship (fee, how long the ad runs). 0 = free
  partnerFreeDays: { type: Number, min: 0, default: 30 }, partnerListingFee: { type: Number, min: 0, default: 0 }, listingValidityDays: { type: Number, min: 1, default: 365 },
  partnerSponsorFee: { type: Number, min: 0, default: 0 }, sponsorDurationDays: { type: Number, min: 1, default: 30 },
  upiId: S, upiQrUrl: S, showQr: { type: Boolean, default: true }, showBank: { type: Boolean, default: false },
  bank: { accountName: S, bankName: S, accountNumber: S, ifsc: S, branch: S }, paymentInstructions: S,
  requireAadhaar: { type: Boolean, default: true }, // collect Aadhaar at member registration
  statsMembersOverride: { type: Number, min: 0, default: 0 }, statsInstitutesOverride: { type: Number, min: 0, default: 0 }, // landing-page numbers, 0 = use real counts
  discountStacking: { type: Boolean, default: false }, discountCap: { type: Number, default: 50 },
  site: { about: S, contactEmail: S, contactPhone: S, address: S, tagline: S, social: { youtube: S, facebook: S, instagram: S, telegram: S, linkedin: S } },
}, T));
