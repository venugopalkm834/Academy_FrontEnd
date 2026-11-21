import { Schema, model } from 'mongoose';
import { oid, S, T } from './_helpers';

export const Membership = model('Membership', new Schema({
  user: { ...oid('User', true), unique: true }, membershipId: { type: String, unique: true, sparse: true }, // e.g. TAC-26-000123
  status: { type: String, enum: ['NONE', 'PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED'], default: 'NONE', index: true },
  plan: oid('MembershipPlan'), planKind: { type: String, enum: ['YEARLY', 'LIFETIME'] }, planName: S,
  verifyCode: { type: String, unique: true, sparse: true }, // goes into the ID card QR code
  trialEndsAt: Date, startsAt: Date, expiresAt: { type: Date, index: true }, // lifetime = no expiresAt
  cardKey: S,
}, T));
