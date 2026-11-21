import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { env } from './env';

// DB_MODE=auto (default): use MONGO_URI if a MongoDB is running there, otherwise a PERSISTENT embedded MongoDB (saved in ../storage/db).
// DB_MODE=mongo: only MONGO_URI.   DB_MODE=embedded: always the embedded one.   DB_MODE=memory: throw-away, data lost on restart.
export const DB_MODE = (process.env.DB_MODE || (process.env.USE_MEMORY_DB === 'true' ? 'memory' : 'auto')).toLowerCase();
export let dbInfo = { mode: DB_MODE, uri: env.mongo };

async function embedded(persist: boolean) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.resolve(process.cwd(), '..', 'storage', 'db');
  if (persist) fs.mkdirSync(dbPath, { recursive: true });
  const srv = await MongoMemoryServer.create({ instance: persist ? { dbPath, port: 27018, storageEngine: 'wiredTiger' } : {} });
  console.log(persist ? `Embedded MongoDB, saved in ${dbPath}\nOpen it in MongoDB Compass with: mongodb://127.0.0.1:27018/academic_club` : 'In-memory MongoDB: data is LOST when the backend restarts');
  return srv.getUri('academic_club');
}

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  let uri = env.mongo;
  if (DB_MODE === 'embedded') uri = await embedded(true);
  else if (DB_MODE === 'memory') uri = await embedded(false);
  else if (DB_MODE === 'auto') {
    try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 }); }
    catch { console.warn(`No MongoDB found at ${uri}. Using the embedded persistent database instead.`); uri = await embedded(true); }
  }
  if (mongoose.connection.readyState !== 1) await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  dbInfo = { mode: DB_MODE, uri };
  console.log(`Database connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}  (mode: ${DB_MODE})`);
};
