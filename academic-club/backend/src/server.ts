import { env } from './config/env'; import { connectDB } from './config/db'; import app, { VERSION } from './app'; import { runSeed } from './seed/seed';
connectDB().then(async () => {
  await runSeed(); // idempotent: makes sure the admin account, categories and settings exist
  app.listen(env.port, () => console.log(`Academic Club API v${VERSION} running: http://localhost:${env.port}`))
    .on('error', (e: any) => { console.error(e.code === 'EADDRINUSE' ? `\nPort ${env.port} is already used by another program, probably an OLD copy of this backend still running.\nClose it (run kill-ports.bat in the project folder) and start again.\n` : e); process.exit(1); });
}).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
