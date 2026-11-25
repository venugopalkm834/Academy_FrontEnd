import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { User, Membership } from '../models';
import { env } from '../config/env';
import { readPrivateImage } from './files';
import { membershipView } from './membership';
import { EDU_LABEL } from './education';

export async function cardData(userId: string): Promise<any | null> {
  const [u, m]: any[] = await Promise.all([User.findById(userId).lean(), Membership.findOne({ user: userId }).lean()]);
  if (!u || !m?.membershipId) return null;
  const v = membershipView(m); const verifyUrl = `${env.client}/verify/${m.verifyCode}`;
  return { fullName: [u.firstName, u.lastName].filter(Boolean).join(' '), memberId: m.membershipId, memberType: u.memberType, education: EDU_LABEL[u.educationLevel] || u.educationLevel, mobile: u.phone,
    address: u.address, city: u.city, pin: u.pin, planName: m.planName, planKind: m.planKind, startsAt: m.startsAt, status: v.status, lifetime: v.lifetime, validUntil: v.validUntil,
    verifyUrl, photo: await readPrivateImage(u.photoKey), qr: await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 }) };
}

const LOGO = path.resolve(__dirname, '../../assets/logo.png'); // backend/assets/logo.png
const fmt = (d?: Date) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
// Aadhaar is never part of the card data, so it can never be printed.
export async function cardPdf(c: any): Promise<Buffer> {
  const doc = new PDFDocument({ size: [486, 306], margin: 0 }); const chunks: Buffer[] = [];
  doc.on('data', (b: Buffer) => chunks.push(b));
  const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));
  const navy = '#062B55', yellow = '#FFC400', grey = '#5b6b82';
  const statusColor = c.status === 'ACTIVE' ? '#1f9d55' : c.status === 'EXPIRED' ? '#d62828' : '#c77700';
  doc.rect(0, 0, 486, 306).fill('#ffffff');
  doc.rect(0, 0, 486, 58).fill(navy); doc.rect(0, 58, 486, 4).fill(yellow);
  let tx = 20;
  if (fs.existsSync(LOGO)) { doc.roundedRect(14, 7, 72, 44, 8).fill('#ffffff'); try { doc.image(LOGO, 18, 10, { fit: [64, 38], align: 'center', valign: 'center' }); tx = 98; } catch { /* logo unreadable: text only */ } }
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('THE ACADEMIC CLUB', tx, 12, { lineBreak: false });
  doc.fillColor(yellow).font('Helvetica').fontSize(8).text('Education  -  Skills  -  Opportunities', tx, 38, { lineBreak: false });
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('MEMBERSHIP ID CARD', 20, 24, { width: 446, align: 'right', lineBreak: false });
  if (c.photo) { try { doc.image(Buffer.from(c.photo.split(',')[1], 'base64'), 22, 78, { fit: [105, 130], align: 'center', valign: 'center' }); } catch { /* unsupported image */ } }
  doc.lineWidth(2).strokeColor(navy).rect(22, 78, 105, 130).stroke();
  doc.fillColor(navy).font('Helvetica-Bold').fontSize(15).text(c.fullName, 142, 78, { width: 215, height: 36 });
  doc.fillColor(grey).font('Helvetica').fontSize(7).text('MEMBER ID', 142, 116, { lineBreak: false });
  doc.fillColor(navy).font('Helvetica-Bold').fontSize(13).text(c.memberId, 142, 125, { lineBreak: false });
  const rows: [string, string][] = [['TYPE', c.memberType === 'PARENT' ? 'Parent' : 'Student'], ['EDUCATION', c.education || '-'], ['MOBILE', c.mobile || '-'], ['CITY / PIN', `${c.city || ''} ${c.pin || ''}`.trim() || '-']];
  rows.forEach(([l, v], i) => { const x = 142 + (i % 2) * 112, y = 150 + Math.floor(i / 2) * 30; doc.fillColor(grey).font('Helvetica').fontSize(7).text(l, x, y, { lineBreak: false }); doc.fillColor('#0d2342').font('Helvetica-Bold').fontSize(9).text(v, x, y + 9, { width: 108, lineBreak: false }); });
  doc.image(Buffer.from(c.qr.split(',')[1], 'base64'), 376, 76, { width: 92 });
  doc.fillColor(grey).font('Helvetica').fontSize(7).text('Scan to verify', 376, 170, { width: 92, align: 'center', lineBreak: false });
  doc.roundedRect(386, 184, 72, 18, 9).fill(statusColor); doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8).text(c.status, 386, 189, { width: 72, align: 'center', lineBreak: false });
  doc.fillColor(grey).font('Helvetica').fontSize(7).text(`Address: ${c.address || '-'}`, 22, 220, { width: 330, height: 40 });
  doc.rect(0, 280, 486, 26).fill(navy);
  doc.fillColor('#ffffff').font('Helvetica').fontSize(8).text(`${c.planName || 'Membership'}  |  Valid from ${fmt(c.startsAt)}  |  ${c.lifetime ? 'Lifetime' : 'Valid until ' + fmt(c.validUntil)}`, 22, 289, { width: 442, lineBreak: false });
  doc.end(); return done;
}
