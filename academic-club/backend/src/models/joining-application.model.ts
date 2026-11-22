import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const JoiningApplication = model('JoiningApplication', new Schema({
  applicationId: { ...SR, unique: true }, member: oid('User', true), offer: oid('Offer', true), course: oid('Course', true), institution: oid('Institution', true),
  membershipId: S, address: S, qualification: S, additionalInfo: S, infoRequest: S,
  status: { type: String, enum: ['SUBMITTED','UNDER_REVIEW','INFO_REQUESTED','INTERVIEW_SCHEDULED','APPROVED','REJECTED','COMPLETED'], default: 'SUBMITTED', index: true },
  snapshot: { originalFee: Number, discountPct: Number, finalFee: Number }, // fees frozen at apply time
}, T));
