// npm run doctor  -> checks everything needed for the site to reach the backend, and says what to fix
import fs from 'fs';
import net from 'net';
const ok = (m) => console.log('  ✓', m), bad = (m, fix) => { console.log('  ✗', m); if (fix) console.log('      → ' + fix); bad.n = (bad.n || 0) + 1; };
const port = (p) => new Promise((res) => { const s = net.connect(p, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(true); }); s.on('error', () => res(false)); s.setTimeout(1500, () => { s.destroy(); res(false); }); });
console.log('Academic Club doctor\n');
const major = +process.versions.node.split('.')[0];
major >= 20 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} is too old`, 'install Node 20 or newer from nodejs.org');
for (const d of ['backend', 'frontend']) fs.existsSync(`${d}/node_modules`) ? ok(`${d} packages installed`) : bad(`${d}/node_modules is missing`, 'run: npm run setup');
for (const m of ['pdfkit', 'qrcode', 'multer', 'mongoose']) fs.existsSync(`backend/node_modules/${m}`) ? 0 : bad(`backend package "${m}" is missing`, 'run: npm run setup  (new packages were added in newer versions)');
if (!fs.existsSync('backend/.env')) bad('backend/.env is missing', 'copy backend/.env.example to backend/.env');
else {
  const env = Object.fromEntries(fs.readFileSync('backend/.env', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
  ok('backend/.env found (PORT=' + (env.PORT || '5000') + ')');
  if (env.AADHAAR_KEY && !/^[0-9a-fA-F]{64}$/.test(env.AADHAAR_KEY)) bad('AADHAAR_KEY in backend/.env is not 64 hex characters (the backend refuses to start)', "run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"  and paste the result");
  for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) env[k] ? 0 : bad(`${k} is empty in backend/.env`, 'set a long random value');
  if ((env.PORT || '5000') !== '5000') bad(`backend PORT is ${env.PORT} but the website expects 5000`, 'set PORT=5000 (or change frontend/proxy.conf.json)');
}
const api = await port(5000);
if (!api) bad('nothing is listening on port 5000: the backend is NOT running', 'run: npm start   (read the first red error in the backend output)');
else {
  try { const h = await (await fetch('http://127.0.0.1:5000/api/health')).json(); ok(`backend answers: v${h.version}, database ${h.db?.name} (${h.db?.mode})`); }
  catch { bad('port 5000 is used by another program that is not this backend', 'run kill-ports.bat, then npm start'); }
}
(await port(4200)) ? ok('website dev server on port 4200 is running') : console.log('  - website dev server (4200) not running (fine if you use: npm run serve)');
console.log(bad.n ? `\n${bad.n} problem(s) found. Fix them in the order shown.` : '\nAll good. Open http://localhost:4200 (npm start) or http://localhost:5000 (npm run serve).');
process.exit(bad.n ? 1 : 0);
