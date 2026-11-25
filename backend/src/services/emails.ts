import { EmailTemplate } from '../models';
import { getSettings } from './settings';
import { sendMail } from './mail';
import { EMAIL_DEFAULTS } from './email-defaults';
import { env } from '../config/env';

const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export const senderFor = (s: any) => { const f = String(s?.emailFrom || env.from).trim(); return f.includes('<') ? f : `The Academic Club <${f}>`; };
export const getTemplate = async (key: string) => {
  const def = EMAIL_DEFAULTS.find((d) => d.key === key); if (!def) throw new Error('Unknown email template ' + key);
  const row: any = await EmailTemplate.findOne({ key }).lean();
  return { def, subject: row?.subject ?? def.subject, body: row?.body ?? def.body, enabled: row ? row.enabled !== false : true, customised: !!row };
};
const fill = (tpl: string, vars: Record<string, any>) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));

// The admin writes plain text with {{placeholders}}. Values are inserted first, then everything is HTML-escaped once, so nothing typed by users can inject HTML.
export function renderEmail(subject: string, body: string, vars: Record<string, any>, s: any) {
  const text = fill(body, vars).replace(/\n{3,}/g, '\n\n').trim();
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f3f7fc;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d6e2f3">
<div style="background:#062B55;color:#fff;padding:14px 20px"><img src="${env.client}/logo.png" height="38" alt="" style="background:#fff;border-radius:8px;padding:3px 6px;vertical-align:middle;margin-right:10px"><b style="font-size:18px;vertical-align:middle">The Academic Club</b><div style="color:#FFC400;font-size:12px">Education • Skills • Opportunities</div></div>
<div style="padding:20px;color:#0d2342;font-size:15px;line-height:1.6">${esc(text).replace(/\n/g, '<br>')}</div>
<div style="background:#f3f7fc;color:#5b6b82;font-size:12px;padding:12px 20px">${esc([s?.site?.contactEmail, s?.site?.whatsapp && 'WhatsApp ' + s.site.whatsapp, s?.site?.address].filter(Boolean).join('  |  '))}</div></div></div>`;
  return { subject: fill(subject, vars).trim(), html };
}
export async function sendTemplate(key: string, to: string | undefined, vars: Record<string, any>): Promise<boolean> {
  try {
    if (!to) return false; const t = await getTemplate(key); if (!t.enabled) return false;
    const s: any = await getSettings();
    const all = { siteName: 'The Academic Club', contactEmail: s.site?.contactEmail || '', whatsapp: s.site?.whatsapp || '', address: s.site?.address || '', ...vars };
    const m = renderEmail(t.subject, t.body, all, s);
    return await sendMail(to, m.subject, m.html, { from: senderFor(s), replyTo: s.site?.contactEmail || undefined });
  } catch (e: any) { console.error('Template email failed:', e.message); return false; }
}
