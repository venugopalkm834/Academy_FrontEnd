import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const Event = model('Event', new Schema({
  title: SR, description: S, date: { type: Date, required: true, index: true }, location: S, imageUrl: S,
  createdBy: oid('User'), active: { type: Boolean, default: true },
}, T));
