import { Schema, model } from 'mongoose';
import { oid, S, T } from './_helpers';

export const Session = model('Session', new Schema({ // also serves as login history
  user: oid('User', true), tokenHash: { type: String, required: true, unique: true },
  ip: S, userAgent: S, revoked: { type: Boolean, default: false }, expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, T));
