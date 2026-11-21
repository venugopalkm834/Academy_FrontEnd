import { Schema, model } from 'mongoose';
import { S, SR, T } from './_helpers';

export const CourseCategory = model('CourseCategory', new Schema({
  name: { ...SR, unique: true }, slug: { ...SR, unique: true }, subtitle: S, imageUrl: S, gradient: [String],
  maxDiscount: { type: Number, default: 50 }, ctaLabel: { ...S, default: 'Explore' }, order: { type: Number, default: 0 }, active: { type: Boolean, default: true },
}, T));
