import { AdminSettings } from '../models';
export const getSettings = async (): Promise<any> => AdminSettings.findOneAndUpdate({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true, new: true }).lean();
