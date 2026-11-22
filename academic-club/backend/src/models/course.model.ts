import { Schema, model } from 'mongoose';
import { oid, S, SR, soft, T } from './_helpers';

// A "course" is anything a partner offers: a class, programme, admission, membership, batch...
export const Course = model('Course', new Schema({
  institution: oid('Institution', true), category: oid('CourseCategory'), serviceType: S,
  name: SR, className: S, description: S, duration: S, seats: { type: Number, min: 0, default: 0 }, imageUrl: S,
  originalFee: { type: Number, required: true, min: 0 },
  institutionDiscountPct: { type: Number, min: 0, max: 100, default: 0 }, // partner's own offer
  clubDiscountPct: { type: Number, min: 0, max: 100, default: 0 },        // set by admin on approval
  admissionFee: { type: Number, min: 0, default: 0 }, additionalFees: { type: Number, min: 0, default: 0 },
  feeStructure: [{ _id: false, label: SR, amount: { type: Number, min: 0, required: true } }],
  offerNote: S, offerExpiresAt: Date,
  effectivePct: Number, discountAmount: Number, finalFee: Number, // always computed server-side
  status: { type: String, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INACTIVE'], default: 'DRAFT', index: true },
  rejectionReason: S, ...soft,
}, T));
