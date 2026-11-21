import { Schema, model } from 'mongoose';
import { S, SR, T, soft } from './_helpers';
import { ROLES } from './constants';

export const User = model('User', new Schema({
  role: { type: String, enum: ROLES, required: true, index: true },
  email: { ...SR, lowercase: true, unique: true }, passwordHash: { type: String, required: true, select: false },
  firstName: SR, lastName: S, phone: { ...S, unique: true, sparse: true }, altPhone: S, // phone = the mobile number used to log in dob: Date, qualification: S, school: S,
  address: S, city: S, state: S, pin: S, photoUrl: S,
  status: { type: String, enum: ['PENDING','ACTIVE','SUSPENDED'], default: 'ACTIVE', index: true },
  emailVerified: { type: Boolean, default: false },
  verifyTokenHash: { type: String, select: false }, resetTokenHash: { type: String, select: false }, resetExpires: { type: Date, select: false },
  pendingEmail: S, notifyPrefs: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
  acceptedTermsAt: Date,
  // Member identity details (registration v2)
  memberType: { type: String, enum: ['STUDENT', 'PARENT'] }, gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] }, district: S,
  educationLevel: S, educationGroup: { type: String, enum: ['LKG_SSLC', 'PUC_DEGREE'] }, // group picks the applicable membership plans
  photoKey: S, // private selfie file
  // Aadhaar: only an encrypted copy, a keyed hash (duplicate check) and the last 4 digits are stored. The full number is never returned by any API.
  aadhaarEnc: { type: String, select: false }, aadhaarHash: { type: String, select: false, unique: true, sparse: true }, aadhaarLast4: S, aadhaarConsentAt: Date,
  ...soft,
}, T));
