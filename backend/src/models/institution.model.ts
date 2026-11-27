import { Schema, model } from 'mongoose';
import { oid, S, SR, soft, T } from './_helpers';

export const Institution = model('Institution', new Schema({
  partner: oid('Partner'), // empty = admin-created
  name: SR, type: SR, // any category key from the ServiceType list (admin managed) description: S, services: [String],
  address: S, city: { ...S, index: true }, state: S, district: { ...S, index: true }, pin: S, geo: { lat: Number, lng: Number },
  logoUrl: S, coverUrl: S, contactPerson: S, contactPhone: S, email: S, website: S,
  active: { type: Boolean, default: true }, featured: { type: Boolean, default: false }, ...soft,
}, T));
