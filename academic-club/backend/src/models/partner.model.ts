import { Schema, model } from 'mongoose';
import { oid, S, SR, soft, T } from './_helpers';
import { INST_TYPES } from './constants';

export const Partner = model('Partner', new Schema({
  user: { ...oid('User', true), unique: true }, institutionName: SR, institutionType: { ...SR, enum: INST_TYPES },
  contactName: SR, website: S, logoUrl: S, registrationDocKey: S, // private storage key, never a public URL
  approval: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  rejectionReason: S, approvedBy: oid('User'), approvedAt: Date,
  // Plan A (normal listing): free days from registration, then a paid listing that the admin verifies
  trialEndsAt: Date, listingStatus: { type: String, enum: ['NONE', 'PENDING', 'ACTIVE', 'EXPIRED'], default: 'NONE' }, listingExpiresAt: Date,
  ...soft,
}, T));
