import { Schema, model } from 'mongoose';
import { S, SR, T } from './_helpers';

// Image ads shown as a slider on the home page and / or in the member panel. Uploaded by the admin.
export const Banner = model('Banner', new Schema({
  title: S, imageUrl: SR, mobileImageUrl: S, // mobileImageUrl is optional: a taller image for phones
  linkUrl: S, // https://... or a path inside the site such as /partners
  placement: { type: String, enum: ['ALL', 'HOME', 'MEMBER'], default: 'ALL', index: true },
  startsAt: Date, expiresAt: Date, order: { type: Number, default: 0 }, active: { type: Boolean, default: true, index: true },
}, T));
