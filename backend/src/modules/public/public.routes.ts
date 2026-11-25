import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { Entertainment, EntertainmentBooking, Banner, Sponsor, Course, Partner, Institution, User, Membership } from '../../models';
import { membershipView, publicCount } from '../../services/membership';
import { readPrivateImage } from '../../services/files';
import { HttpError, wrap } from '../../middleware';
import { getSettings } from '../../services/settings';
import { computeListing } from '../../services/access';

const r = Router();
const liveFilter = (): any => ({ active: true, $and: [
  { $or: [{ startsAt: null }, { startsAt: { $lte: new Date() } }] },
  { $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] },
] });
const liveSponsors = async (): Promise<any[]> =>
  ((await Sponsor.find(liveFilter()).sort('order -createdAt').populate({ path: 'institution', match: { active: true, deletedAt: null } }).lean()) as any[]).filter((s) => s.institution);
const inst = (i: any) => ({ id: i._id, name: i.name, type: i.type, city: i.city, state: i.state, district: i.district, pin: i.pin, address: i.address, contactPhone: i.contactPhone, email: i.email, logoUrl: i.logoUrl, coverUrl: i.coverUrl, description: i.description, services: i.services || [] });

// Institutions members can see: approved, active partners whose listing is valid (free days / paid), plus admin-created ones.
async function visibleInstitutions(): Promise<any[]> {
  const s = await getSettings();
  const partners: any[] = await Partner.find({ approval: 'APPROVED', deletedAt: null }).populate('user', 'status').lean();
  const ok = partners.filter((p) => p.user?.status === 'ACTIVE' && computeListing(s, p).listed).map((p) => p._id);
  return (await Institution.find({ active: true, deletedAt: null, $or: [{ partner: { $in: ok } }, { partner: null }] }).lean()) as any[];
}

// Featured sponsors (ads on the main page and in the user panel)
r.get('/ads', wrap(async (_req, res) => {
  const vis = new Set((await visibleInstitutions()).map((i) => String(i._id)));
  const list = (await liveSponsors()).filter((s) => vis.has(String(s.institution._id)));
  res.json({ ads: list.map((s) => ({ id: s._id, headline: s.headline, adText: s.adText, imageUrl: s.imageUrl, institution: inst(s.institution) })) });
}));

// Find services: every listed institution, sponsors first.  ?q=yoga&type=YOGA&city=Pune&page=1
r.get('/services', wrap(async (req, res) => {
  const { q = '', type = '', city = '', state = '', district = '', pin = '', page = '1' } = req.query as Record<string, string>;
  const insts = await visibleInstitutions();
  const sp = new Map((await liveSponsors()).map((x) => [String(x.institution._id), x]));
  const courses: any[] = await Course.find({ institution: { $in: insts.map((i) => i._id) }, status: 'APPROVED', deletedAt: null }).select('institution name finalFee effectivePct').lean();
  const by = new Map<string, any[]>();
  courses.forEach((c) => { const k = String(c.institution); if (!by.has(k)) by.set(k, []); by.get(k)!.push(c); });
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = insts.filter((i) => {
    const cs = by.get(String(i._id)) || [], s = sp.get(String(i._id));
    if (!cs.length && !s) return false;
    if (type && i.type !== type) return false;
    if (city && !(i.city || '').toLowerCase().includes(city.trim().toLowerCase())) return false;
    if (state && (i.state || '').toLowerCase() !== state.trim().toLowerCase()) return false;
    if (district && (i.district || '').toLowerCase() !== district.trim().toLowerCase()) return false;
    if (pin && !String(i.pin || '').startsWith(pin.trim())) return false;
    const hay = [i.name, i.type, i.description, i.city, (i.services || []).join(' '), s?.headline, s?.adText, ...cs.map((c) => c.name)].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  }).sort((a, b) => Number(sp.has(String(b._id))) - Number(sp.has(String(a._id))) || String(a.name).localeCompare(String(b.name)));
  const size = 12, pg = Math.max(1, +page || 1), pages = Math.max(1, Math.ceil(list.length / size));
  const items = list.slice((pg - 1) * size, pg * size).map((i) => {
    const cs = by.get(String(i._id)) || [], s = sp.get(String(i._id));
    return { id: i._id, sponsored: !!s, headline: s?.headline, institution: inst(i), offeringCount: cs.length,
      topDiscount: cs.reduce((m, c) => Math.max(m, c.effectivePct || 0), 0), fromFee: cs.length ? Math.min(...cs.map((c) => c.finalFee ?? 0)) : null, offerings: cs.slice(0, 3).map((c) => c.name) };
  });
  res.json({ items, total: list.length, page: pg, pages });
}));

r.get('/services/:id', wrap(async (req, res) => {
  const i: any = isValidObjectId(req.params.id) ? (await visibleInstitutions()).find((x) => String(x._id) === req.params.id) : null;
  if (!i) throw new HttpError(404, 'Service not found');
  const s = (await liveSponsors()).find((x) => String(x.institution._id) === String(i._id));
  const courses: any[] = await Course.find({ institution: i._id, status: 'APPROVED', deletedAt: null }).sort('-effectivePct').lean();
  res.json({ id: i._id, sponsored: !!s, headline: s?.headline, adText: s?.adText, imageUrl: s?.imageUrl,
    institution: { ...inst(i), address: i.address, pin: i.pin, contactPerson: i.contactPerson, contactPhone: i.contactPhone, email: i.email, website: i.website },
    offerings: courses.map((c) => ({ id: c._id, name: c.name, className: c.className, serviceType: c.serviceType, description: c.description, duration: c.duration, seats: c.seats, imageUrl: c.imageUrl,
      originalFee: c.originalFee, effectivePct: c.effectivePct, discountAmount: c.discountAmount, finalFee: c.finalFee, admissionFee: c.admissionFee, additionalFees: c.additionalFees,
      feeStructure: c.feeStructure || [], offerNote: c.offerNote, offerExpiresAt: c.offerExpiresAt })) });
}));

// Landing page counters (real counts unless the admin set a display number)
r.get('/stats', wrap(async (_req, res) => {
  const s = await getSettings();
  const [members, institutes] = await Promise.all([User.countDocuments({ role: 'MEMBER', deletedAt: null }), Partner.countDocuments({ approval: 'APPROVED', deletedAt: null })]);
  const m = s.statsMembersOverride > 0 ? s.statsMembersOverride : members, i = s.statsInstitutesOverride > 0 ? s.statsInstitutesOverride : institutes;
  res.json({ members: m, institutes: i, membersLabel: publicCount(m), institutesLabel: publicCount(i) });
}));
r.get('/config', wrap(async (_req, res) => { const s = await getSettings(); res.json({ requireAadhaar: s.requireAadhaar !== false }); }));

// State / district / city options for the location search, taken from the institutes members can actually see
r.get('/locations', wrap(async (req, res) => {
  const { state = '', district = '' } = req.query as Record<string, string>;
  const all = await visibleInstitutions(); const uniq = (a: any[]) => [...new Set(a.filter(Boolean))].sort((x, y) => String(x).localeCompare(String(y)));
  const inState = all.filter((i) => !state || i.state === state), inDist = inState.filter((i) => !district || i.district === district);
  res.json({ states: uniq(all.map((i) => i.state)), districts: uniq(inState.map((i) => i.district)), cities: uniq(inDist.map((i) => i.city)) });
}));

// Member card verification (the QR code on the ID card opens this)
r.get('/verify/:code', wrap(async (req, res) => {
  const m: any = await Membership.findOne({ verifyCode: String(req.params.code) }).lean(); if (!m) return res.json({ valid: false });
  const u: any = await User.findById(m.user).select('firstName lastName memberType photoKey status').lean(); const v = membershipView(m);
  res.json({ valid: v.status === 'ACTIVE' && u?.status !== 'SUSPENDED', status: u?.status === 'SUSPENDED' ? 'SUSPENDED' : v.status, memberId: m.membershipId, name: [u?.firstName, u?.lastName].filter(Boolean).join(' '),
    memberType: u?.memberType, planName: m.planName, lifetime: v.lifetime, validUntil: v.validUntil, photo: await readPrivateImage(u?.photoKey) });
}));

// Banner ads for the slider: ?placement=HOME (default) or MEMBER
r.get('/banners', wrap(async (req, res) => {
  const placement = req.query.placement === 'MEMBER' ? 'MEMBER' : 'HOME';
  const items: any[] = await Banner.find({ ...liveFilter(), placement: { $in: ['ALL', placement] } }).sort('order -createdAt').limit(10).lean();
  res.json({ items: items.map((b) => ({ id: b._id, title: b.title, imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl, linkUrl: b.linkUrl })) });
}));

// Contact details the admin entered (shown on the site, in member / academy panels and behind the WhatsApp button)
const waNumber = (v: string) => { const d = String(v || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d.startsWith('0') ? '91' + d.slice(1) : d; };
r.get('/contact', wrap(async (_req, res) => {
  const s = await getSettings(); const c = s.site || {}; const n = waNumber(c.whatsapp);
  res.json({ email: c.contactEmail || '', whatsapp: c.whatsapp || '', phone: c.contactPhone || '', address: c.address || '', hours: c.workingHours || '',
    whatsappLink: n ? `https://wa.me/${n}?text=${encodeURIComponent(c.whatsappMessage || 'Hello, I need help with The Academic Club.')}` : '' });
}));

// Club Entertainment slider (home page, member panel). Past events and expired listings are hidden.
r.get('/entertainment', wrap(async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const items: any[] = await Entertainment.find({ ...liveFilter(), deletedAt: null, $or: [{ eventDate: null }, { eventDate: { $gte: today } }] }).sort('order eventDate -createdAt').limit(30).lean();
  const used: any[] = await EntertainmentBooking.aggregate([{ $match: { entertainment: { $in: items.map((i) => i._id) }, status: { $in: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED'] } } }, { $group: { _id: '$entertainment', n: { $sum: '$qty' } } }]);
  const map = new Map(used.map((u) => [String(u._id), u.n]));
  res.json({ items: items.map((i) => ({ id: i._id, title: i.title, subtitle: i.subtitle, description: i.description, imageUrl: i.imageUrl, venue: i.venue, eventDate: i.eventDate, eventTime: i.eventTime,
    price: i.price, maxPerBooking: i.maxPerBooking, seatsLeft: i.capacity > 0 ? Math.max(0, i.capacity - (map.get(String(i._id)) || 0)) : null })) });
}));
export default r;
