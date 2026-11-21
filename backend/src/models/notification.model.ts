import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const Notification = model('Notification', new Schema({
  user: oid('User', true), type: S, title: SR, body: S, link: S, read: { type: Boolean, default: false },
}, T));
