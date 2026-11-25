import { Router } from 'express';
import { z } from 'zod';
import { EmailTemplate, User } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';
import { EMAIL_DEFAULTS } from '../../services/email-defaults';
import { getTemplate, renderEmail, senderFor } from '../../services/emails';
import { getSettings } from '../../services/settings';
import { sendMail } from '../../services/mail';

// Admin edits the wording of the automatic emails here
const r = Router(); r.use(authenticate, requireRole('ADMIN'));
const SAMPLE: Record<string, any> = { name: 'Asha', amount: 499, purpose: 'your membership', transactionId: 'TXN123456', details: 'Member ID: TAC-26-000123\n', reason: 'The amount did not match', courseName: 'Spoken English batch',
  institutionName: 'Sample Academy', bookingNo: 'BKSAMPLE1', institutionPhone: '9876500001', institutionAddress: '12 Main Road, Pune', memberName: 'Ravi Kumar', memberPhone: '9876543210', memberEmail: 'ravi@example.com' };

r.get('/email-templates', wrap(async (_req, res) => {
  res.json({ items: await Promise.all(EMAIL_DEFAULTS.map(async (d) => { const t = await getTemplate(d.key); return { key: d.key, name: d.name, description: d.description, placeholders: [...d.placeholders, 'contactEmail', 'whatsapp', 'address'], subject: t.subject, body: t.body, enabled: t.enabled, customised: t.customised }; })) });
}));
r.put('/email-templates/:key', validate(z.object({ subject: z.string().trim().min(2).max(200), body: z.string().trim().min(5).max(4000), enabled: z.boolean() })), wrap(async (req, res) => {
  const def = EMAIL_DEFAULTS.find((d) => d.key === req.params.key); if (!def) throw new HttpError(404, 'Unknown template');
  await EmailTemplate.findOneAndUpdate({ key: def.key }, { $set: { ...req.body, name: def.name } }, { upsert: true }); res.json({ message: 'Saved' });
}));
r.delete('/email-templates/:key', wrap(async (req, res) => { await EmailTemplate.deleteOne({ key: String(req.params.key) }); res.json({ message: 'Reset to the default wording' }); }));
r.post('/email-templates/:key/test', wrap(async (req, res) => {
  const t = await getTemplate(String(req.params.key)); const s: any = await getSettings(); const me: any = await User.findById(req.user!.id).select('email');
  const to = s.notifyEmail || s.site?.contactEmail || me?.email; if (!to) throw new HttpError(400, 'Set a notification email first (Contact & Email settings).');
  const m = renderEmail('[TEST] ' + t.subject, t.body, { ...SAMPLE, contactEmail: s.site?.contactEmail || '', whatsapp: s.site?.whatsapp || '', address: s.site?.address || '' }, s);
  const ok = await sendMail(to, m.subject, m.html, { from: senderFor(s), replyTo: s.site?.contactEmail || undefined });
  if (!ok) throw new HttpError(502, 'The email could not be sent. Check RESEND_API_KEY and that the sender domain is verified in Resend.');
  res.json({ message: 'Test email sent to ' + to });
}));
export default r;
