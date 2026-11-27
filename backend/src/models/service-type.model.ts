import { Schema, model } from 'mongoose';
import { S, SR, T } from './_helpers';

// The categories shown in "Find Partner Institutes" and used when an academy registers (School, College, Placements …). The admin adds, edits and removes them.
export const ServiceType = model('ServiceType', new Schema({
  key: { ...SR, uppercase: true, unique: true }, label: SR, icon: { ...S, default: '✨' },
  order: { type: Number, default: 0 }, active: { type: Boolean, default: true, index: true },
}, T));
export const DEFAULT_SERVICE_TYPES: [string, string, string][] = [
  ['SCHOOL', 'School', '🏫'], ['COLLEGE', 'College', '🎓'], ['TRAINING', 'Training Institute', '💼'], ['COACHING', 'Tuition & Coaching', '📚'], ['DANCE', 'Dance', '💃'],
  ['YOGA', 'Yoga & Wellness', '🧘'], ['MUSIC', 'Music', '🎸'], ['SPORTS', 'Sports & Fitness', '⚽'], ['PLACEMENTS', 'Placements', '🧑‍💼'], ['OTHER', 'Other', '✨'],
];
