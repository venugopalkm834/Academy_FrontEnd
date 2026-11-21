import fs from 'fs';
import path from 'path';
import { PRIVATE_DIR } from '../config/storage';
export async function readPrivateImage(key?: string): Promise<string | undefined> {
  if (!key) return undefined;
  try {
    const buf = await fs.promises.readFile(path.join(PRIVATE_DIR, path.basename(key)));
    return `data:image/${path.extname(key).toLowerCase() === '.png' ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`;
  } catch { return undefined; }
}
