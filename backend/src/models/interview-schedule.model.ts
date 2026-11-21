import { Schema, model } from 'mongoose';
import { oid, S, SR, T } from './_helpers';

export const InterviewSchedule = model('InterviewSchedule', new Schema({
  application: oid('JoiningApplication', true), date: { type: Date, required: true }, time: SR, contactPerson: S, contactPhone: S,
  mode: { type: String, enum: ['ONLINE','OFFLINE'], required: true }, meetingLink: S, instructions: S,
  status: { type: String, enum: ['SCHEDULED','RESCHEDULED','CANCELLED','DONE'], default: 'SCHEDULED' },
}, T));
