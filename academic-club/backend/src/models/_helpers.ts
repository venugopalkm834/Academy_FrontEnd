import { Schema } from 'mongoose';
export const T = { timestamps: true };
export const oid = (ref: string, req = false) => ({ type: Schema.Types.ObjectId, ref, required: req, index: true });
export const S = { type: String, trim: true };
export const SR = { ...S, required: true };
export const soft = { deletedAt: { type: Date, default: null } };
