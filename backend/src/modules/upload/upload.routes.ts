import { Router, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer'; import path from 'path'; import fs from 'fs'; import crypto from 'crypto';
import { authenticate, requireRole, HttpError, wrap } from '../../middleware';
import { Partner } from '../../models';

import { UPLOAD_DIR, PRIVATE_DIR } from '../../config/storage';
export { UPLOAD_DIR, PRIVATE_DIR };
const store = (dir: string) => multer.diskStorage({ destination: dir, filename: (_q, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6)) });
const images = multer({ storage: store(UPLOAD_DIR), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_q, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)) });
const docs = multer({ storage: store(PRIVATE_DIR), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_q, f, cb) => cb(null, /^(application\/pdf|image\/(jpeg|png))$/.test(f.mimetype)) });

// If a request is rejected (expired session, wrong role) before multer reads the upload, drain the body first.
// Otherwise the dev proxy / browser can report "connection aborted" instead of the real error message.
const drain = (mw: RequestHandler): RequestHandler => (req, res, next) => mw(req, res, (err?: any) => { if (err) req.resume(); next(err); });
const selfies = multer({ storage: store(PRIVATE_DIR), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_q, f, cb) => cb(null, /^image\/(jpeg|png)$/.test(f.mimetype)) });
const r = Router();
// Registration happens before login, so the selfie upload is public (rate limited, JPG/PNG only, stored privately).
r.post('/selfie', rateLimit({ windowMs: 15 * 60e3, limit: 20, standardHeaders: true }), selfies.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please upload a JPG or PNG photo (max 2 MB)');
  res.json({ key: req.file.filename });
});
r.use(drain(authenticate));
r.post('/image', drain(requireRole('PARTNER', 'ADMIN')), images.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please upload a JPG, PNG or WebP image (max 2 MB)');
  res.json({ url: `/uploads/${req.file.filename}` });
});
r.post('/document', drain(requireRole('PARTNER')), docs.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please upload a PDF, JPG or PNG (max 5 MB)');
  await Partner.updateOne({ user: req.user!.id }, { registrationDocKey: req.file.filename });
  res.json({ message: 'Document uploaded' });
}));
r.post('/proof', drain(requireRole('MEMBER', 'PARTNER')), docs.single('file'), (req, res) => { // payment screenshot: private
  if (!req.file) throw new HttpError(400, 'Please upload a PDF, JPG or PNG (max 5 MB)');
  res.json({ key: req.file.filename });
});
export default r;
