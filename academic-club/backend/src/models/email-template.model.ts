import { Schema, model } from 'mongoose';
import { S, SR, T } from './_helpers';

// Admin-edited wording of the automatic emails. A missing row means the built-in default text is used.
export const EmailTemplate = model('EmailTemplate', new Schema({
  key: { type: String, required: true, unique: true }, name: S, subject: SR, body: SR, enabled: { type: Boolean, default: true },
}, T));
