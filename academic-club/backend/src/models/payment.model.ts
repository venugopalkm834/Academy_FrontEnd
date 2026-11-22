import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

// Manual UPI / bank payment. Never trusted until an admin approves it.
export const Payment = model('Payment', new Schema({
  user: oid('User', true), purpose: { type: String, enum: ['MEMBERSHIP', 'BOOKING', 'LISTING', 'SPONSORSHIP'], required: true, index: true }, booking: oid('Booking'), plan: oid('MembershipPlan'),
  method: { type: String, enum: ['MANUAL', 'GATEWAY'], default: 'MANUAL' },
  gatewayOrderId: { type: String, unique: true, sparse: true }, gatewayPaymentId: { type: String, unique: true, sparse: true }, // unique = a payment can only be processed once
  paidAt: Date, sponsorRequest: oid('SponsorRequest'),
  amount: { type: Number, required: true, min: 0 }, transactionId: { ...SR, uppercase: true, unique: true }, proofKey: S, // proof is a private file
  status: { type: String, enum: ['CREATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FAILED', 'REFUNDED'], default: 'UNDER_REVIEW', index: true },
  reviewedBy: oid('User'), reviewedAt: Date, rejectionReason: S,
}, T));
