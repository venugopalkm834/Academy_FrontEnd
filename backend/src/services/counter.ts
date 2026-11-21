import { Counter } from '../models';
export const nextSeq = async (key: string): Promise<number> => ((await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean()) as any).seq;
