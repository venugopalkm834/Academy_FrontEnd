import { Schema, model } from 'mongoose';
import { S, SR, soft, T } from './_helpers';

// "Club Entertainment": shows / events / experiences the admin lists. They slide on the home page and members can book them.
export const Entertainment = model('Entertainment', new Schema({
  title: SR, subtitle: S, description: S, imageUrl: S, venue: S, eventDate: Date, eventTime: S,
  price: { type: Number, min: 0, default: 0 },          // per ticket, 0 = free
  capacity: { type: Number, min: 0, default: 0 },       // total seats, 0 = unlimited
  maxPerBooking: { type: Number, min: 1, default: 10 },
  startsAt: Date, expiresAt: Date,                       // when the listing is visible
  order: { type: Number, default: 0 }, active: { type: Boolean, default: true, index: true }, ...soft,
}, T));
