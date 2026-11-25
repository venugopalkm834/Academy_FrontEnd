import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import crypto from 'crypto'; import { z } from 'zod';
import { env } from '../../config/env';
import { User, Partner, Institution, Membership, Session, Role, INST_TYPES } from '../../models';
import { wrap, validate, authenticate, HttpError } from '../../middleware';
import { sendMail } from '../../services/mail';
import { getSettings } from '../../services/settings';
import { onRegistered } from '../../services/events';
import { mobileField } from '../../services/mobile';
import fs from 'fs'; import path from 'path';
import { PRIVATE_DIR } from '../../config/storage';
import { validAadhaar } from '../../services/aadhaar';
import { encrypt, keyedHash } from '../../services/crypto';
import { EDU_LEVELS, educationGroup } from '../../services/education';

const r = Router();
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const rnd = () => crypto.randomBytes(32).toString('hex');
const pw = z.string().min(8).regex(/[A-Z]/, 'Needs an uppercase letter').regex(/[0-9]/, 'Needs a number');
const base = { email: z.string().email().toLowerCase(), phone: mobileField, password: pw, confirmPassword: z.string() };
const match = (d: any) => d.password === d.confirmPassword;
const EDU = EDU_LEVELS.map((e) => e.value) as [string, ...string[]];
const memberSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(80), memberType: z.enum(['STUDENT', 'PARENT']),
  email: z.string().email().toLowerCase(), phone: mobileField, gender: z.enum(['MALE', 'FEMALE', 'OTHER']), dob: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future'),
  address: z.string().trim().min(5, 'Enter your full address').max(300), state: z.string().trim().min(2).max(60), district: z.string().trim().min(2).max(60), city: z.string().trim().min(2).max(60),
  pin: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'), educationLevel: z.enum(EDU), school: z.string().max(120).optional(),
  aadhaar: z.string().optional(), aadhaarConsent: z.boolean().optional(), photoKey: z.string().regex(/^[0-9a-f-]{36}\.(jpe?g|png)$/, 'Please add your photo'),
  password: pw, confirmPassword: z.string(), acceptTerms: z.literal(true), acceptPrivacy: z.literal(true),
}).refine(match, { message: 'Passwords do not match', path: ['confirmPassword'] });
const partnerSchema = z.object({ ...base, institutionName: z.string().min(2), institutionType: z.enum(INST_TYPES as [string, ...string[]]),
  contactName: z.string().min(2), altPhone: mobileField.optional(), address: z.string().min(3), city: z.string(), state: z.string(), pin: z.string().regex(/^\d{6}$/), website: z.string().url().optional() }).refine(match, { message: 'Passwords do not match', path: ['confirmPassword'] });

async function issue(res: Response, req: Request, userId: string, role: Role) {
  const access = jwt.sign({ sub: userId, role }, env.access, { expiresIn: '15m' });
  const refresh = rnd();
  await Session.create({ user: userId, tokenHash: sha(refresh), ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 30 * 864e5) });
  res.cookie('rt', refresh, { httpOnly: true, sameSite: 'strict', secure: env.prod && env.client.startsWith('https'), path: '/api/auth', maxAge: 30 * 864e5 });
  return access;
}
const sendVerify = (u: { email: string; firstName: string }, t: string) =>
  sendMail(u.email, 'Verify your email', `<p>Hi ${u.firstName}, <a href="${env.client}/verify-email?token=${t}">verify your email</a>.</p>`);

r.post('/member/register', validate(memberSchema), wrap(async (req, res) => {
  const { password, confirmPassword, acceptTerms, acceptPrivacy, aadhaar, aadhaarConsent, fullName, ...d } = req.body; const t = rnd();
  const st = await getSettings();
  const raw = String(aadhaar || '').replace(/\s/g, ''); let ident: any = {};
  if (st.requireAadhaar !== false && !raw) throw new HttpError(400, 'Aadhaar number is required');
  if (raw) {
    if (!validAadhaar(raw)) throw new HttpError(400, 'Enter a valid 12-digit Aadhaar number');
    if (!aadhaarConsent) throw new HttpError(400, 'Please consent to the secure use of your Aadhaar number for identity verification');
    const h = keyedHash(raw);
    if (await User.exists({ aadhaarHash: h })) throw new HttpError(409, 'This Aadhaar number is already registered');
    ident = { aadhaarEnc: encrypt(raw), aadhaarHash: h, aadhaarLast4: raw.slice(-4), aadhaarConsentAt: new Date() }; // the full number is never stored in plain text
  }
  if (!fs.existsSync(path.join(PRIVATE_DIR, path.basename(d.photoKey)))) throw new HttpError(400, 'Your photo was not found. Please upload it again.');
  const [first, ...rest] = fullName.split(/\s+/);
  const u = await User.create({ ...d, ...ident, firstName: first, lastName: rest.join(' '), role: 'MEMBER', qualification: d.educationLevel, educationGroup: educationGroup(d.educationLevel),
    passwordHash: await bcrypt.hash(password, 12), verifyTokenHash: sha(t), acceptedTermsAt: new Date() });
  await Membership.create({ user: u._id, status: 'NONE', trialEndsAt: new Date(Date.now() + (st.freeTrialDays || 0) * 864e5) }); await sendVerify(u, t);
  await onRegistered('MEMBER', u, d.memberType === 'PARENT' ? 'a parent' : 'a student');
  res.status(201).json({ message: 'Registered successfully. Log in with your mobile number, then choose a membership plan to get your ID card.' });
}));

r.post('/partner/register', validate(partnerSchema), wrap(async (req, res) => {
  const { password, confirmPassword, institutionName, institutionType, website, ...d } = req.body; const t = rnd();
  const u = await User.create({ ...d, firstName: d.contactName, role: 'PARTNER', status: 'PENDING', passwordHash: await bcrypt.hash(password, 12), verifyTokenHash: sha(t) });
  const p = await Partner.create({ user: u._id, institutionName, institutionType, contactName: d.contactName, website, trialEndsAt: new Date(Date.now() + ((await getSettings()).partnerFreeDays || 0) * 864e5) });
  await Institution.create({ partner: p._id, name: institutionName, type: institutionType, address: d.address, city: d.city, state: d.state, pin: d.pin, contactPerson: d.contactName, contactPhone: d.phone, email: d.email, website });
  await sendVerify(u, t);
  await onRegistered('PARTNER', u, institutionName);
  res.status(201).json({ message: 'Registration received. Your account is pending admin approval.' });
}));

r.post('/login', validate(z.object({ mobile: mobileField, password: z.string().min(1), role: z.enum(['ADMIN','PARTNER','MEMBER']) })), wrap(async (req, res) => {
  const { mobile, password, role } = req.body;
  const u = await User.findOne({ phone: mobile, deletedAt: null }).select('+passwordHash');
  // one generic error for unknown mobile, wrong password and wrong portal
  if (!u || u.role !== role || !(await bcrypt.compare(password, u.passwordHash))) throw new HttpError(401, 'Invalid credentials');
  if (u.status === 'SUSPENDED') throw new HttpError(403, 'Account suspended. Contact support.');
  const accessToken = await issue(res, req, u.id, u.role as Role);
  res.json({ accessToken, user: { id: u.id, role: u.role, phone: u.phone, email: u.email, firstName: u.firstName, status: u.status, emailVerified: u.emailVerified } });
}));

r.post('/refresh', wrap(async (req, res) => {
  const old = req.cookies?.rt; if (!old) throw new HttpError(401, 'No session');
  const s = await Session.findOne({ tokenHash: sha(old), revoked: false, expiresAt: { $gt: new Date() } });
  if (!s) throw new HttpError(401, 'Session expired');
  const u = await User.findById(s.user); if (!u || u.status === 'SUSPENDED') throw new HttpError(403, 'Account unavailable');
  s.revoked = true; await s.save(); // rotate refresh token
  res.json({ accessToken: await issue(res, req, u.id, u.role as Role) });
}));

r.post('/logout', wrap(async (req, res) => {
  if (req.cookies?.rt) await Session.updateOne({ tokenHash: sha(req.cookies.rt) }, { revoked: true });
  res.clearCookie('rt', { path: '/api/auth' }).json({ message: 'Logged out' });
}));

r.post('/verify-email', validate(z.object({ token: z.string().length(64) })), wrap(async (req, res) => {
  const u = await User.findOneAndUpdate({ verifyTokenHash: sha(req.body.token) }, { emailVerified: true, $unset: { verifyTokenHash: 1 } });
  if (!u) throw new HttpError(400, 'Invalid or used verification link'); res.json({ message: 'Email verified' });
}));

r.post('/forgot-password', validate(z.object({ mobile: mobileField })), wrap(async (req, res) => {
  const u = await User.findOne({ phone: req.body.mobile, deletedAt: null });
  if (u?.email) { const t = rnd(); u.resetTokenHash = sha(t); u.resetExpires = new Date(Date.now() + 36e5); await u.save();
    await sendMail(u.email, 'Reset your password', `<p><a href="${env.client}/reset-password?token=${t}">Reset password</a> (valid 1 hour).</p>`); }
  res.json({ message: 'If this mobile number is registered, a reset link has been sent to the email on the account.' });
}));

r.post('/reset-password', validate(z.object({ token: z.string().length(64), password: pw })), wrap(async (req, res) => {
  const u = await User.findOne({ resetTokenHash: sha(req.body.token), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires');
  if (!u) throw new HttpError(400, 'Invalid or expired reset link');
  u.passwordHash = await bcrypt.hash(req.body.password, 12); u.resetTokenHash = undefined; u.resetExpires = undefined; await u.save();
  await Session.updateMany({ user: u._id }, { revoked: true }); // sign out everywhere
  res.json({ message: 'Password updated. Please log in.' });
}));

r.get('/me', authenticate, wrap(async (req, res) => { res.json({ user: await User.findById(req.user!.id) }); }));
r.get('/sessions', authenticate, wrap(async (req, res) => { res.json({ sessions: await Session.find({ user: req.user!.id }).sort('-createdAt').limit(20).select('-tokenHash') }); }));
r.delete('/sessions/:id', authenticate, wrap(async (req, res) => { await Session.updateOne({ _id: req.params.id, user: req.user!.id }, { revoked: true }); res.json({ message: 'Session ended' }); }));
export default r;
