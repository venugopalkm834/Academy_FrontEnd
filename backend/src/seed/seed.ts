import bcrypt from 'bcryptjs'; import mongoose from 'mongoose';
import { connectDB } from '../config/db'; import '../config/env';
import { User, CourseCategory, AdminSettings, MembershipPlan } from '../models';
import { seedDemo } from './demo';
import { seedContactDefaults, seedDemoContent } from './demo-content';
import { normMobile } from '../services/mobile';
const cats: [string, string, string[], string][] = [
  ['Education Courses','education-courses',['#1e63d6','#0b3a8a'],'View Courses'], ['Skill Development','skill-development',['#2e9e44','#17692a'],'Explore Skills'],
  ['Sports & Fitness','sports-fitness',['#ff9a1f','#e8610c'],'Join Now'], ['Dance & Music','dance-music',['#9b3fd1','#5f1f94'],'Join Now'],
  ['Tuition & Coaching','tuition-coaching',['#12a9a0','#0b6f8f'],'Enroll Now'], ['Professional Courses','professional-courses',['#0b4aa8','#062b55'],'Get Started'],
];
export async function runSeed() {
  const email = process.env.ADMIN_EMAIL, pass = process.env.ADMIN_PASSWORD; if (!email || !pass) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  const phone = normMobile(process.env.ADMIN_PHONE || '9000000000');
  await User.updateOne({ email }, { $setOnInsert: { role: 'ADMIN', email, phone, firstName: 'Admin', status: 'ACTIVE', emailVerified: true, passwordHash: await bcrypt.hash(pass, 12) } }, { upsert: true });
  await User.updateOne({ email, phone: { $exists: false } }, { $set: { phone } }); // admins created by older versions get a mobile number
  for (const [i, [name, slug, gradient, ctaLabel]] of cats.entries())
    await CourseCategory.updateOne({ slug }, { $setOnInsert: { name, slug, gradient, ctaLabel, maxDiscount: 50, order: i } }, { upsert: true });
  await AdminSettings.updateOne({ key: 'global' }, { $setOnInsert: { key: 'global', paymentRequiredAt: 'NONE', freeTrialDays: 7, membershipFee: 999, bookingFee: 199, upiId: 'yourupi@bank', paymentInstructions: 'Pay the exact amount, then enter the transaction ID and upload the screenshot. We verify within 24 hours. (Demo text: change in Admin > Payment Settings)', membershipBenefits: ['Exclusive partner discounts','Appreciation certificate','Career guidance'], emailFrom: 'The Academic Club <info@academicclub.com>', notifyEmail: process.env.ADMIN_EMAIL, site: { tagline: 'Together for a Smarter, Stronger and Successful Future', contactEmail: 'info@academicclub.com' } } }, { upsert: true });
  if (!(await MembershipPlan.exists({}))) await MembershipPlan.insertMany([ // starter plans: the admin edits prices / adds plans in Membership Plans
    { name: 'One-Year Membership', kind: 'YEARLY', price: 499, validityDays: 365, educationGroup: 'ANY', description: 'Full member benefits for one year', benefits: ['Digital ID card', 'Member-only offers', 'Partner discounts'], order: 1 },
    { name: 'Lifetime Membership', kind: 'LIFETIME', price: 1999, educationGroup: 'ANY', description: 'Pay once, member for life', benefits: ['Digital ID card', 'Member-only offers', 'Partner discounts', 'No renewals'], order: 2 }]);
  await seedContactDefaults(); // WhatsApp number + contact email (admin can change them)
  if (process.env.SEED_DEMO !== 'false') { await seedDemo(); await seedDemoContent(); }
  console.log(`Seeded. Admin login: mobile ${phone} / password from .env (ADMIN_PASSWORD)`);
}
if (require.main === module) connectDB().then(runSeed).then(() => mongoose.disconnect()).catch((e) => { console.error(e); process.exit(1); });
