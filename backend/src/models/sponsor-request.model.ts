import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

// Plan B: a partner asks to be shown as a featured sponsor on the main page. Becomes a Sponsor (ad) when the admin approves.
export const SponsorRequest = model('SponsorRequest', new Schema({
  institution: oid('Institution', true), partner: oid('Partner', true), headline: SR, adText: S, imageUrl: S,
  durationDays: { type: Number, default: 30 }, amount: { type: Number, default: 0 },
  status: { type: String, enum: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'CANCELLED'], default: 'PENDING_PAYMENT', index: true },
  note: S, sponsor: oid('Sponsor'),
}, T));
