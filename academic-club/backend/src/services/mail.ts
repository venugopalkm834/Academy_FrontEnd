import nodemailer from 'nodemailer';
import { env } from '../config/env';

const tx = env.smtp.host ? nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined }) : null;
export const resendConfigured = () => !!process.env.RESEND_API_KEY;

// Order: Resend (RESEND_API_KEY) -> SMTP -> printed in the console (development). The sender domain must be verified in Resend.
export async function sendMail(to: string | string[], subject: string, html: string, opts: { from?: string; replyTo?: string } = {}): Promise<boolean> {
  const from = opts.from || env.from; const list = Array.isArray(to) ? to : [to];
  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: list, subject, html, ...(opts.replyTo ? { reply_to: opts.replyTo } : {}) }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      return true;
    }
    if (tx) { await tx.sendMail({ from, to: list, subject, html, replyTo: opts.replyTo }); return true; }
    console.log(`[mail:dev] from=${from} to=${list.join(',')} subject=${subject}\n${html}`);
    return true;
  } catch (e: any) { console.error('Email could not be sent:', e.message); return false; }
}
