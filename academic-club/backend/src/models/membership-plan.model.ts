import { Schema, model } from 'mongoose';
import { S, SR, T } from './_helpers';

// Created and priced by the admin. educationGroup = ANY, or only for LKG-SSLC / PUC-Degree members.
export const MembershipPlan = model('MembershipPlan', new Schema({
  name: SR, kind: { type: String, enum: ['YEARLY', 'LIFETIME'], required: true }, price: { type: Number, required: true, min: 0 },
  validityDays: { type: Number, min: 1, default: 365 }, educationGroup: { type: String, enum: ['ANY', 'LKG_SSLC', 'PUC_DEGREE'], default: 'ANY' },
  description: S, benefits: [String], active: { type: Boolean, default: true, index: true }, order: { type: Number, default: 0 },
}, T));
