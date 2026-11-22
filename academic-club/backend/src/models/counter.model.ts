import { Schema, model } from 'mongoose';
export const Counter = model('Counter', new Schema({ key: { type: String, required: true, unique: true }, seq: { type: Number, default: 0 } }));
