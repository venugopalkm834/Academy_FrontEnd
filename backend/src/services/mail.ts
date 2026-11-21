import nodemailer from 'nodemailer';
import { env } from '../config/env';
const tx = env.smtp.host ? nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined }) : null;
export async function sendMail(to: string, subject: string, html: string) {
  if (!tx) return console.log(`[mail:dev] to=${to} subject=${subject}\n${html}`);
  await tx.sendMail({ from: env.from, to, subject, html });
}
