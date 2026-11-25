import { User, Partner, Institution, Notification, Booking, Membership, EntertainmentBooking } from '../models';
import { getSettings } from './settings';
import { sendMail } from './mail';
import { sendTemplate, senderFor } from './emails';

const safe = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (e: any) { console.error('Notification failed:', e.message); } };
const name = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Member';
const PURPOSE: Record<string, string> = { MEMBERSHIP: 'your membership', BOOKING: 'your booking', LISTING: 'your academy listing', SPONSORSHIP: 'your sponsorship / banner ad', ENTERTAINMENT: 'your Club Entertainment booking' };

// In-app notification for every admin + an email to the admin notification address
export const notifyAdmins = (title: string, body: string) => safe(async () => {
  const admins: any[] = await User.find({ role: 'ADMIN', deletedAt: null }).select('_id');
  if (admins.length) await Notification.insertMany(admins.map((a) => ({ user: a._id, type: 'ADMIN', title, body })));
  const s: any = await getSettings(); const to = s.notifyEmail || s.site?.contactEmail || process.env.ADMIN_EMAIL;
  if (to) await sendMail(to, `[Academic Club] ${title}`, `<p style="font-family:Arial">${body.replace(/</g, '&lt;')}</p><p style="font-family:Arial;color:#5b6b82;font-size:12px">Open the admin panel to review.</p>`, { from: senderFor(s) });
});
export const notifyUser = (user: any, title: string, body: string) => safe(async () => { await Notification.create({ user, type: 'INFO', title, body }); });

export const onRegistered = (kind: 'MEMBER' | 'PARTNER', u: any, extra = '') =>
  notifyAdmins(kind === 'MEMBER' ? 'New member registered' : 'New academy registered', `${name(u)} (${u.phone || u.email}) registered${extra ? ' as ' + extra : ''}.`);
export const onPaymentSubmitted = (p: any) => safe(async () => {
  const u: any = await User.findById(p.user).select('firstName lastName role'); await notifyAdmins('Payment to verify', `${name(u)} submitted Rs. ${p.amount} for ${p.purpose.toLowerCase()}. Open Payments to verify it.`);
});
export const onBookingCreated = (b: any) => safe(async () => {
  const [m, i]: any[] = await Promise.all([User.findById(b.member).select('firstName lastName phone'), Institution.findById(b.institution).select('name')]);
  await notifyAdmins('New booking', `${name(m)} (${m?.phone || ''}) booked "${b.snapshot?.courseName}" at ${i?.name} (${b.bookingNo}).`);
});
export const onBookingConfirmed = (b: any) => safe(async () => {
  const [m, i]: any[] = await Promise.all([User.findById(b.member).select('firstName lastName email phone'), Institution.findById(b.institution).select('name partner address city contactPhone email')]);
  const pt: any = i?.partner ? await Partner.findById(i.partner).select('user contactName') : null; const pu: any = pt ? await User.findById(pt.user).select('email firstName') : null;
  const vars = { courseName: b.snapshot?.courseName, institutionName: i?.name, bookingNo: b.bookingNo, institutionPhone: i?.contactPhone || '', institutionAddress: [i?.address, i?.city].filter(Boolean).join(', '),
    memberName: name(m), memberPhone: m?.phone || '', memberEmail: m?.email || '' };
  await sendTemplate('booking_member', m?.email, { ...vars, name: m?.firstName || 'there' });
  await sendTemplate('booking_partner', pu?.email || i?.email, { ...vars, name: pt?.contactName || pu?.firstName || 'there' });
  await notifyUser(b.member, 'Booking confirmed', `Your booking ${b.bookingNo} for ${b.snapshot?.courseName} is confirmed.`);
  if (pu) await notifyUser(pu._id, 'New booking', `${name(m)} booked ${b.snapshot?.courseName} (${b.bookingNo}).`);
});
export const onPaymentApproved = (p: any) => safe(async () => {
  const u: any = await User.findById(p.user).select('firstName lastName email role'); if (!u) return;
  let details = '';
  if (p.purpose === 'MEMBERSHIP') { const m: any = await Membership.findOne({ user: p.user }).lean(); if (m?.membershipId) details = `Member ID: ${m.membershipId}\n`; }
  if (p.purpose === 'BOOKING' && p.booking) { const b: any = await Booking.findById(p.booking).lean(); if (b) details = `Booking: ${b.bookingNo} (${b.snapshot?.courseName})\n`; }
  if (p.purpose === 'ENTERTAINMENT' && p.entertainmentBooking) { const eb: any = await EntertainmentBooking.findById(p.entertainmentBooking).lean(); if (eb) details = `Booking: ${eb.bookingNo} (${eb.snapshot?.title})\n`; }
  await sendTemplate(u.role === 'PARTNER' ? 'payment_approved_partner' : 'payment_approved_member', u.email, { name: u.firstName, amount: p.amount, purpose: PURPOSE[p.purpose] || p.purpose, transactionId: p.transactionId, details });
});
export const onPaymentRejected = (p: any, reason: string) => safe(async () => {
  const u: any = await User.findById(p.user).select('firstName email'); if (!u) return;
  await sendTemplate('payment_rejected', u.email, { name: u.firstName, amount: p.amount, purpose: PURPOSE[p.purpose] || p.purpose, reason });
});

export const onEntertainmentCreated = (b: any) => safe(async () => {
  const m: any = await User.findById(b.member).select('firstName lastName phone');
  await notifyAdmins('New Club Entertainment booking', `${name(m)} (${m?.phone || ''}) booked ${b.qty} x "${b.snapshot?.title}" (${b.bookingNo}), Rs. ${b.amount}.`);
});
export const onEntertainmentConfirmed = (b: any) => safe(async () => {
  const m: any = await User.findById(b.member).select('firstName email'); if (!m) return;
  await sendTemplate('entertainment_member', m.email, { name: m.firstName, title: b.snapshot?.title, eventDate: [b.snapshot?.eventDate && new Date(b.snapshot.eventDate).toDateString(), b.snapshot?.eventTime].filter(Boolean).join(' '),
    venue: b.snapshot?.venue || '', qty: b.qty, amount: b.amount, bookingNo: b.bookingNo });
  await notifyUser(b.member, 'Booking confirmed', `Your Club Entertainment booking ${b.bookingNo} for ${b.snapshot?.title} is confirmed.`);
});
