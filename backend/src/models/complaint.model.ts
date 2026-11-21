import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const Complaint = model('Complaint', new Schema({
  user: oid('User', true), subject: SR, message: SR, application: oid('JoiningApplication'),
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN', index: true },
  response: S, resolvedBy: oid('User'),
}, T));
