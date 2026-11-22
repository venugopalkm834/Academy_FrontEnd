import path from 'path';
import fs from 'fs';
// Outside backend/, so the dev watcher never restarts on uploads.
export const STORAGE = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.resolve(process.cwd(), '..', 'storage');
export const UPLOAD_DIR = path.join(STORAGE, 'uploads');  // public images (logos, covers, ads, offering photos)
export const PRIVATE_DIR = path.join(STORAGE, 'private'); // selfies, documents, payment proofs: never served publicly
[UPLOAD_DIR, PRIVATE_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));
