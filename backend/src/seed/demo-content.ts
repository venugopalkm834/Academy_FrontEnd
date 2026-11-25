import fs from 'fs';
import path from 'path';
import { Banner, Entertainment, AdminSettings } from '../models';
import { UPLOAD_DIR } from '../config/storage';
import { normMobile } from '../services/mobile';

// Simple coloured pictures written to storage/uploads so banners and events look right on a fresh install. The admin replaces them with real ones.
const art = (file: string, title: string, sub: string, c1: string, c2: string, w: number, h: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.86}" cy="${h * 0.2}" r="${h * 0.34}" fill="#FFC400" opacity="0.25"/><circle cx="${w * 0.1}" cy="${h * 0.95}" r="${h * 0.4}" fill="#ffffff" opacity="0.08"/>
<text x="${w * 0.06}" y="${h * 0.48}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${h * 0.15}" fill="#ffffff">${title}</text>
<text x="${w * 0.06}" y="${h * 0.66}" font-family="Arial, Helvetica, sans-serif" font-size="${h * 0.075}" fill="#FFC400">${sub}</text></svg>`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), svg); return `/uploads/${file}`;
};
const days = (n: number) => new Date(Date.now() + n * 864e5);

export async function seedContactDefaults() {
  const wa = normMobile(process.env.WHATSAPP_NUMBER || process.env.ADMIN_PHONE || '9000000000');
  await AdminSettings.updateOne({ key: 'global', $or: [{ 'site.whatsapp': { $exists: false } }, { 'site.whatsapp': '' }] }, { $set: { 'site.whatsapp': wa, 'site.whatsappMessage': 'Hello, I need help with The Academic Club.' } });
  await AdminSettings.updateOne({ key: 'global', $or: [{ 'site.contactEmail': { $exists: false } }, { 'site.contactEmail': '' }] }, { $set: { 'site.contactEmail': 'info@academicclub.com' } });
}
export async function seedDemoContent() {
  if (!(await Entertainment.exists({}))) {
    await Entertainment.insertMany([
      { title: 'Stand-up Comedy Night', subtitle: 'Members get priority seats', venue: 'City Town Hall', eventDate: days(14), eventTime: '7:00 PM', price: 299, capacity: 120, description: 'An evening of live stand-up with the best comics in town.', imageUrl: art('demo-comedy.svg', 'Comedy Night', 'Live stand-up', '#9b3fd1', '#3b0f6b', 800, 450), order: 1 },
      { title: 'Kids Magic Show', subtitle: 'Fun for the whole family', venue: 'Community Hall', eventDate: days(21), eventTime: '5:00 PM', price: 149, capacity: 80, description: 'Magic, balloons and laughter for children of all ages.', imageUrl: art('demo-magic.svg', 'Kids Magic Show', 'Family fun', '#ff9a1f', '#c2410c', 800, 450), order: 2 },
      { title: 'Music Concert Night', subtitle: 'Live band and open-air seating', venue: 'Lakeside Grounds', eventDate: days(30), eventTime: '6:30 PM', price: 499, capacity: 200, description: 'A night of live music under the stars.', imageUrl: art('demo-music.svg', 'Music Concert', 'Live band', '#1e63d6', '#062b55', 800, 450), order: 3 }]);
  }
  if (!(await Banner.exists({}))) {
    await Banner.insertMany([
      { title: 'Join The Academic Club', imageUrl: art('demo-banner1.svg', 'Join The Academic Club', 'Exclusive discounts on courses, classes and activities', '#062B55', '#1e63d6', 1600, 500), mobileImageUrl: art('demo-banner1m.svg', 'Join The Academic Club', 'Exclusive member discounts', '#062B55', '#1e63d6', 800, 600), linkUrl: '/member/register', placement: 'ALL', order: 1 },
      { title: 'Find partner institutes near you', imageUrl: art('demo-banner2.svg', 'Find institutes near you', 'Schools, colleges, dance, yoga, coaching and more', '#2e9e44', '#17692a', 1600, 500), mobileImageUrl: art('demo-banner2m.svg', 'Find institutes near you', 'Schools, dance, yoga, coaching', '#2e9e44', '#17692a', 800, 600), linkUrl: '/partners', placement: 'ALL', order: 2 }]);
  }
}
