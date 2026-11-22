import bcrypt from 'bcryptjs';
import { User, Partner, Institution, Course, Sponsor } from '../models';
import { calcPrice } from '../services/pricing';

// [type, name, city, description, services, [offering, fee, partnerOffer%, clubOffer%, duration]...]
type Row = [string, string, string, string, string[], [string, number, number, number, string][]];
const DEMO: Row[] = [
  ['SCHOOL', 'Greenwood Public School', 'Bengaluru', 'CBSE school from nursery to grade 12 with smart classrooms, labs and sports grounds.', ['CBSE', 'Nursery to 12', 'Transport', 'Sports'],
    [['Grade 1-5 Admission', 60000, 5, 10, '1 year'], ['Grade 6-10 Admission', 72000, 5, 10, '1 year']]],
  ['COLLEGE', 'Sunrise Institute of Technology', 'Pune', 'Engineering and management college with industry-linked programmes and placement support.', ['B.Tech', 'MBA', 'Placements', 'Hostel'],
    [['B.Tech Computer Science', 150000, 5, 15, '4 years'], ['MBA (2 year)', 180000, 0, 20, '2 years']]],
  ['TRAINING', 'EduNext Training Institute', 'Bengaluru', 'Job-ready skill training in spoken English, IT and digital skills with certification.', ['Spoken English', 'Digital Marketing', 'Python', 'Certificate'],
    [['Spoken English & Communication', 10000, 0, 50, '3 months'], ['Digital Marketing Course', 24000, 10, 30, '4 months']]],
  ['DANCE', 'DanceVibe Studio', 'Mumbai', 'Learn Bollywood, hip-hop, contemporary and classical dance from professional choreographers.', ['Bollywood', 'Hip-hop', 'Classical', 'Zumba'],
    [['Bollywood Dance Batch', 6000, 0, 30, '3 months'], ['Hip-hop for Teens', 7500, 10, 25, '3 months']]],
  ['YOGA', 'Zen Yoga & Wellness Studio', 'Hyderabad', 'Daily yoga, meditation and wellness programmes for all ages with certified instructors.', ['Hatha Yoga', 'Meditation', 'Prenatal Yoga', 'Online classes'],
    [['Monthly Yoga Membership', 3000, 0, 40, '1 month'], ['Teacher Training (200 hr)', 45000, 10, 20, '2 months']]],
  ['COACHING', 'BrightMind Coaching Centre', 'Chennai', 'Tuition and exam coaching for grades 8-12, JEE and NEET with small batches.', ['Grade 8-12', 'JEE', 'NEET', 'Weekend batches'],
    [['JEE Foundation Batch', 55000, 5, 15, '1 year'], ['Grade 10 Board Prep', 20000, 0, 25, '6 months']]],
];
export async function seedDemo() {
  if (await Partner.exists({})) return;
  const passwordHash = await bcrypt.hash('Partner@123', 10);
  for (const [i, [type, name, city, description, services, offers]] of DEMO.entries()) {
    const email = `${type.toLowerCase()}@demo.com`;
    const user = await User.create({ role: 'PARTNER', email, passwordHash, firstName: name.split(' ')[0], phone: `987650000${i + 1}`, status: 'ACTIVE', emailVerified: true, city });
    const partner = await Partner.create({ user: user._id, institutionName: name, institutionType: type, contactName: 'Admissions Office', approval: 'APPROVED', listingStatus: 'ACTIVE', listingExpiresAt: new Date(Date.now() + 365 * 864e5) });
    const inst = await Institution.create({ partner: partner._id, name, type, description, services, city, state: 'India', address: `12 Main Road, ${city}`, contactPerson: 'Admissions Office', contactPhone: `987650000${i + 1}`, email });
    for (const [cn, fee, ip, cp, duration] of offers) {
      const p = calcPrice({ originalFee: fee, institutionPct: ip, clubPct: cp });
      await Course.create({ institution: inst._id, name: cn, serviceType: type, duration, seats: 30, originalFee: fee, institutionDiscountPct: ip, clubDiscountPct: cp, description: `${cn} at ${name}.`,
        feeStructure: [{ label: 'Tuition', amount: Math.round(fee * 0.8) }, { label: 'Materials & activities', amount: Math.round(fee * 0.2) }],
        offerNote: `Academic Club members save up to ${p.effectivePct}%`, effectivePct: p.effectivePct, discountAmount: p.discountAmount, finalFee: p.finalFee, status: 'APPROVED' });
    }
    if (i < 5) await Sponsor.create({ institution: inst._id, headline: `${name}: up to ${Math.max(...offers.map((o) => Math.max(o[2], o[3])))}% off for members`, adText: description, order: i, active: true });
  }
  console.log('Demo data created. Partner logins (mobile / password Partner@123): ' + DEMO.map((x, i) => `${x[0]}=987650000${i + 1}`).join(', '));
}
