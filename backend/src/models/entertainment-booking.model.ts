import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const EntertainmentBooking = model('EntertainmentBooking', new Schema({
  bookingNo: { ...SR, unique: true }, member: oid('User', true), entertainment: oid('Entertainment', true),
  qty: { type: Number, min: 1, default: 1 }, amount: { type: Number, default: 0 },
  snapshot: { title: String, eventDate: Date, eventTime: String, venue: String, price: Number }, // what was booked, even if the listing changes later
  status: { type: String, enum: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED', 'CANCELLED'], default: 'PENDING_PAYMENT', index: true },
  paymentNote: S,
}, T));
