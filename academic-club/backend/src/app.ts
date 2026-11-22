import express from 'express'; import helmet from 'helmet'; import cors from 'cors'; import cookieParser from 'cookie-parser'; import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { DB_MODE } from './config/db';
import { env } from './config/env';
import publicRoutes from './modules/public/public.routes'; import partnerRoutes from './modules/partner/partner.routes'; import paymentsRoutes from './modules/payments/payments.routes'; import membershipRoutes from './modules/member/membership.routes'; import webhookRoutes from './modules/webhooks/webhooks.routes'; import adminMembershipRoutes from './modules/admin/admin.membership.routes'; import memberRoutes from './modules/member/member.routes'; import adminRoutes from './modules/admin/admin.routes'; import uploadRoutes, { UPLOAD_DIR } from './modules/upload/upload.routes'; import authRoutes from './modules/auth/auth.routes'; import { errorHandler, auditMutations } from './middleware';
export const VERSION = '0.9.0'; // bump when the API changes; the frontend warns if it talks to an older backend
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }), cors({ origin: env.client, credentials: true }), express.json({ limit: '1mb', verify: (req: any, _res, buf) => { req.rawBody = buf; } }), cookieParser(), auditMutations);
app.get('/', (_q, s) => { s.type('html').send('<h2>The Academic Club API is running ✅</h2><p>Open the website at <a href="http://localhost:4200">http://localhost:4200</a> · <a href="/api/health">health check</a></p>'); });
app.get('/api/health', (_q, s) => { s.json({ ok: true, version: VERSION, folder: process.cwd(), db: { mode: DB_MODE, name: mongoose.connection.name, host: mongoose.connection.host, port: mongoose.connection.port } }); });
app.use('/api/auth', rateLimit({ windowMs: 15 * 60e3, limit: 50, standardHeaders: true }), authRoutes);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/member', membershipRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminMembershipRoutes); // before adminRoutes: its dashboard / members / payments list replace the older ones
app.use('/api/admin', adminRoutes);
// Single-process mode: if the Angular app has been built (npm run build in frontend), this server also serves the website,
// so http://localhost:5000 shows the site and the API together (no second server, no proxy, no CORS).
const WEB_DIST = process.env.FRONTEND_DIST ? path.resolve(process.env.FRONTEND_DIST) : path.resolve(process.cwd(), '..', 'frontend', 'dist', 'academic-club', 'browser');
if (fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
  app.use(express.static(WEB_DIST, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/|uploads\/).*/, (_q, s) => { s.setHeader('Cache-Control', 'no-cache'); s.sendFile(path.join(WEB_DIST, 'index.html')); });
  console.log(`Serving the website from ${WEB_DIST}`);
}
app.use((q, s) => { q.resume(); s.status(404).json({ message: `API route not found: ${q.method} ${q.originalUrl}. If this feature should exist, your backend is out of date: restart it from the latest backend folder.` }); });
app.use(errorHandler);
export default app;
