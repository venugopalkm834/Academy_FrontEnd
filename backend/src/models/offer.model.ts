import { Schema, model } from 'mongoose';
import { oid, S, T, soft } from './_helpers';

export const Offer = model('Offer', new Schema({
  course: oid('Course', true), clubDiscountPct: { type: Number, min: 0, max: 100, required: true },
  effectivePct: Number, discountAmount: Number, finalFee: Number, savings: Number, // always computed by services/pricing.ts
  startsAt: { type: Date, default: Date.now }, expiresAt: { type: Date, required: true, index: true },
  memberOnly: { type: Boolean, default: true }, terms: S,
  status: { type: String, enum: ['PENDING_APPROVAL','APPROVED','REJECTED','INACTIVE'], default: 'PENDING_APPROVAL', index: true }, ...soft,
}, T));
