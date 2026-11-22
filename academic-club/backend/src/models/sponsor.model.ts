import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

// Admin picks an institution to feature. Active sponsors show as ads in the user panel and on the Sponsors page.
export const Sponsor = model('Sponsor', new Schema({
  institution: oid('Institution', true), headline: SR, adText: S, imageUrl: S,
  startsAt: Date, expiresAt: Date, order: { type: Number, default: 0 }, active: { type: Boolean, default: true, index: true },
}, T));
