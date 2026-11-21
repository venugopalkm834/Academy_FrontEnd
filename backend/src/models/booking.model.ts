import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const Booking = model('Booking', new Schema({
  bookingNo: { ...SR, unique: true }, member: oid('User', true), course: oid('Course', true), institution: oid('Institution', true), note: S,
  amount: { type: Number, default: 0 }, // booking fee charged (0 = free)
  snapshot: { courseName: String, originalFee: Number, finalFee: Number }, // price when booked
  status: { type: String, enum: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED', 'CANCELLED'], default: 'PENDING_PAYMENT', index: true },
  paymentNote: S, // e.g. why the last payment was rejected
}, T));
