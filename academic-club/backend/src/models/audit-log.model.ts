import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const AuditLog = model('AuditLog', new Schema({
  actor: oid('User'), role: S, action: { ...SR, index: true }, entity: S, entityId: S, before: Schema.Types.Mixed, after: Schema.Types.Mixed, ip: S,
}, T));
