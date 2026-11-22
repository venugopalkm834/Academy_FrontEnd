import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ZodSchema, ZodError } from 'zod';
import { env } from '../config/env';
import { AuditLog, User, Role } from '../models';

export class HttpError extends Error { constructor(public status: number, msg: string, public details?: unknown) { super(msg); } }
declare global { namespace Express { interface Request { user?: { id: string; role: Role } } } }

export const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler => (q, s, n) => { fn(q, s, n).catch(n); };

export const authenticate: RequestHandler = wrap(async (req, _res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication required');
  let p: any; try { p = jwt.verify(h.slice(7), env.access); } catch { throw new HttpError(401, 'Invalid or expired token'); }
  const u = await User.findById(p.sub).select('role status deletedAt');
  if (!u || u.deletedAt || u.status === 'SUSPENDED') throw new HttpError(403, 'Account unavailable');
  req.user = { id: u.id, role: u.role as Role }; next();
});

export const requireRole = (...roles: Role[]): RequestHandler => (req, _res, next) =>
  !req.user ? next(new HttpError(401, 'Authentication required')) : roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Forbidden'));

export const validate = (schema: ZodSchema): RequestHandler => (req, _res, next) => {
  const r = schema.safeParse(req.body); if (!r.success) return next(r.error); req.body = r.data; next();
};

export async function audit(req: Request, action: string, entity?: string, entityId?: string, before?: unknown, after?: unknown) {
  await AuditLog.create({ actor: req.user?.id, role: req.user?.role, action, entity, entityId, before, after, ip: req.ip });
}
// Safety net: logs every successful admin/partner mutation. Handlers call audit() for before/after detail.
export const auditMutations: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    if (req.method !== 'GET' && res.statusCode < 400 && req.user && req.user.role !== 'MEMBER')
      AuditLog.create({ actor: req.user.id, role: req.user.role, action: `${req.method} ${req.baseUrl}${req.path}`, ip: req.ip }).catch(() => {});
  });
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, _n: NextFunction) => {
  req.resume(); // never leave an unread upload body behind (it makes browsers report "connection aborted")
  if (err instanceof ZodError) return res.status(400).json({ message: 'Validation failed', errors: err.flatten().fieldErrors });
  if (err?.name === 'MulterError') return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload failed' });
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, details: err.details });
  if (err?.code === 11000) { const f = Object.keys(err.keyPattern || {}); const nice: Record<string, string> = { phone: 'mobile number', email: 'email', transactionId: 'transaction ID' }; return res.status(409).json({ message: `This ${f.map((k) => nice[k] || k).join(', ')} is already in use`, fields: f }); }
  console.error(err); res.status(500).json({ message: 'Internal server error' });
};
