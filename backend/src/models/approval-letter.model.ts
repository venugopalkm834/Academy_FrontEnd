import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const ApprovalLetter = model('ApprovalLetter', new Schema({
  application: { ...oid('JoiningApplication', true), unique: true }, letterNo: { ...SR, unique: true }, verifyCode: { ...SR, unique: true },
  pdfKey: S, issuedAt: { type: Date, default: Date.now }, status: { type: String, enum: ['ISSUED','REVOKED'], default: 'ISSUED' }, revokedReason: S,
}, T));
