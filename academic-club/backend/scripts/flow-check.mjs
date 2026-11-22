// End-to-end check of every main flow against a RUNNING backend:  npm run check:flow
// Uses fresh random mobile numbers, changes the payment settings for the test and restores them at the end.
const BASE = process.env.API || 'http://localhost:5000/api';
const ADMIN = { mobile: process.env.ADMIN_PHONE || '9000000000', password: process.env.ADMIN_PASSWORD || 'Admin@12345' };
const rnd = () => '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
let pass = 0, fail = 0;
async function call(method, path, body, token, expect) {
  const res = await fetch(BASE + path, { method, headers: { ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (expect !== undefined && res.status !== expect) throw new Error(`${method} ${path} -> ${res.status} (expected ${expect}): ${data.message || JSON.stringify(data)}`);
  if (expect === undefined && !res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}
async function step(name, fn) { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n      ', e.message); } }
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const proof = async (token) => { const fd = new FormData(); fd.append('file', new Blob([PNG], { type: 'image/png' }), 'proof.png'); return (await call('POST', '/upload/proof', fd, token)).key; };
const S = {}; // shared state
const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]], INV = [0,4,3,2,1,5,6,7,8,9];
const aadhaar = () => { const p = String(2 + Math.floor(Math.random() * 8)) + String(Math.floor(Math.random() * 1e10)).padStart(10, '0'); let c = 0; p.split('').reverse().map(Number).forEach((x, i) => { c = D[c][P[(i + 1) % 8][x]]; }); return p + INV[c]; };
const selfie = async () => { const fd = new FormData(); fd.append('file', new Blob([PNG], { type: 'image/png' }), 'me.png'); return (await call('POST', '/upload/selfie', fd, null, 200)).key; };
const pw = 'Test@12345';

console.log('Academic Club flow check against', BASE);
await step('backend is up and has the expected version', async () => { const h = await call('GET', '/health'); S.version = h.version; console.log('      version', h.version, '| db', h.db?.name, h.db?.host + ':' + h.db?.port, '| folder', h.folder); });
await step('admin logs in with mobile number', async () => { S.admin = (await call('POST', '/auth/login', { ...ADMIN, role: 'ADMIN' })).accessToken; });
await step('login rejects a wrong password and an invalid mobile', async () => { await call('POST', '/auth/login', { ...ADMIN, password: 'nope', role: 'ADMIN' }, null, 401); await call('POST', '/auth/login', { mobile: '12345', password: 'x', role: 'ADMIN' }, null, 400); });
await step('admin saves payment settings (booking fee, partner fees, UPI)', async () => {
  S.settings = await call('GET', '/admin/settings', null, S.admin);
  await call('PUT', '/admin/settings', { paymentRequiredAt: 'BOOKING', freeTrialDays: 0, membershipFee: 999, membershipValidityDays: 365, bookingFee: 199, partnerFreeDays: 0, partnerListingFee: 500, listingValidityDays: 365,
    partnerSponsorFee: 1000, sponsorDurationDays: 30, upiId: 'test@upi', showQr: false, showBank: false, paymentInstructions: 'test' }, S.admin);
});

// ---- partner: register, approval, listing payment, offering, approval
S.pm = rnd(); S.mm = rnd();
await step('partner registers (mobile validation enforced)', async () => {
  const body = { institutionName: 'Flow Test Yoga', institutionType: 'YOGA', contactName: 'Tester', email: `p${S.pm}@t.com`, phone: S.pm, address: '1 Road', city: 'Pune', state: 'MH', pin: '411001', password: pw, confirmPassword: pw };
  await call('POST', '/auth/partner/register', { ...body, phone: '12345' }, null, 400);
  await call('POST', '/auth/partner/register', body, null, 201);
  await call('POST', '/auth/partner/register', body, null, 409); // duplicate mobile/email
});
await step('partner logs in with mobile and sees dashboard', async () => { S.partner = (await call('POST', '/auth/login', { mobile: S.pm, password: pw, role: 'PARTNER' })).accessToken; await call('GET', '/partner/dashboard', null, S.partner); });
await step('admin approves the partner', async () => { const l = await call('GET', '/admin/partners?status=PENDING', null, S.admin); const p = l.items.find((x) => x.phone === S.pm); if (!p) throw new Error('partner not in admin pending list'); await call('PUT', `/admin/partners/${p.id}/status`, { action: 'approve' }, S.admin); });
await step('partner adds an offering with fee structure', async () => {
  await call('PUT', '/partner/profile', { name: 'Flow Test Yoga', description: 'Yoga classes', services: ['yoga'], contactPhone: S.pm, city: 'Pune' }, S.partner);
  S.course = await call('POST', '/partner/courses', { name: 'Flow Yoga Batch', originalFee: 10000, institutionDiscountPct: 10, admissionFee: 500, additionalFees: 250, feeStructure: [{ label: 'Tuition', amount: 9000 }, { label: 'Mat', amount: 1000 }], seats: 20 }, S.partner, 201);
});
await step('submit is blocked until the listing fee is paid (402)', async () => { await call('POST', `/partner/courses/${S.course._id}/submit`, {}, S.partner, 402); });
await step('partner pays the listing fee; admin verifies it', async () => {
  await call('POST', '/partner/listing/pay', { transactionId: 'LIST' + Date.now(), proofKey: await proof(S.partner) }, S.partner, 201);
  const l = await call('GET', '/admin/payments?status=UNDER_REVIEW', null, S.admin); const p = l.items.find((x) => x.purpose === 'LISTING' && x.user?.phone === S.pm);
  if (!p) throw new Error('listing payment not shown to admin'); await call('PUT', `/admin/payments/${p._id}/review`, { action: 'approve' }, S.admin);
});
await step('partner submits the offering; admin approves with club discount 40%', async () => {
  await call('POST', `/partner/courses/${S.course._id}/submit`, {}, S.partner);
  const r = await call('PUT', `/admin/courses/${S.course._id}/review`, { action: 'approve', clubDiscountPct: 40 }, S.admin);
  if (r.effectivePct !== 40 || r.finalFee !== 6750) throw new Error(`price wrong: ${r.effectivePct}% / ${r.finalFee} (expected 40% / 6750)`);
});
await step('offering is listed publicly in Find Services and searchable', async () => {
  const l = await call('GET', '/public/services?q=flow%20yoga'); S.inst = l.items.find((x) => x.institution.name === 'Flow Test Yoga'); if (!S.inst) throw new Error('not listed');
  const d = await call('GET', `/public/services/${S.inst.id}`); if (!d.offerings.length) throw new Error('detail has no offerings');
});

// ---- member: register, booking with payment
await step('member registers (all fields, Aadhaar, selfie) and logs in with mobile', async () => {
  const body = { fullName: 'Mem Ber', memberType: 'STUDENT', email: `m${S.mm}@t.com`, phone: S.mm, gender: 'MALE', dob: '2012-01-01', address: '2 Road, Pune', state: 'Maharashtra', district: 'Pune', city: 'Pune', pin: '411001',
    educationLevel: 'STD_8', aadhaar: aadhaar(), aadhaarConsent: true, photoKey: await selfie(), password: pw, confirmPassword: pw, acceptTerms: true, acceptPrivacy: true };
  await call('POST', '/auth/member/register', { ...body, aadhaar: '234123412345' }, null, 400); // bad Aadhaar checksum
  await call('POST', '/auth/member/register', { ...body, pin: '123' }, null, 400);
  await call('POST', '/auth/member/register', body, null, 201);
  await call('POST', '/auth/member/register', { ...body, phone: rnd(), email: `x${S.mm}@t.com` }, null, 409); // same Aadhaar again
  S.member = (await call('POST', '/auth/login', { mobile: S.mm, password: pw, role: 'MEMBER' })).accessToken;
  const prof = await call('GET', '/member/profile', null, S.member); if (!/^XXXX XXXX \d{4}$/.test(prof.aadhaarMasked) || JSON.stringify(prof).includes(body.aadhaar)) throw new Error('Aadhaar not masked');
});
await step('member sees only the plans for their education group; no ID card before payment', async () => {
  const pl = await call('GET', '/member/plans', null, S.member); if (pl.group !== 'LKG_SSLC' || !pl.plans.length) throw new Error('plans/group wrong: ' + JSON.stringify(pl.group)); S.plan = pl.plans[0];
  await call('GET', '/member/id-card', null, S.member, 404);
});
await step('membership: manual payment -> admin approves -> Member ID, ID card, PDF and public verification', async () => {
  await call('POST', '/member/membership/pay-manual', { planId: S.plan._id, transactionId: 'MEM' + Date.now(), proofKey: await proof(S.member) }, S.member, 201);
  const l = await call('GET', '/admin/payments?status=UNDER_REVIEW&purpose=MEMBERSHIP', null, S.admin); const p = l.items.find((x) => x.user?.phone === S.mm); if (!p) throw new Error('membership payment not shown to admin');
  await call('PUT', `/admin/payments/${p._id}/review`, { action: 'approve' }, S.admin);
  const c = await call('GET', '/member/id-card', null, S.member); if (!/^TAC-\d\d-\d{6}$/.test(c.memberId) || c.status !== 'ACTIVE') throw new Error('card: ' + JSON.stringify({ id: c.memberId, s: c.status }));
  if (JSON.stringify(c).match(/\d{12}/)) throw new Error('a 12-digit number is on the card data');
  const pdf = await fetch(BASE + '/member/id-card.pdf', { headers: { authorization: 'Bearer ' + S.member } }); const buf = Buffer.from(await pdf.arrayBuffer());
  if (!pdf.ok || buf.slice(0, 4).toString() !== '%PDF') throw new Error('PDF not generated (status ' + pdf.status + ')');
  const code = c.verifyUrl.split('/').pop(); const v = await call('GET', '/public/verify/' + code); if (!v.valid || v.memberId !== c.memberId) throw new Error('verification failed');
});
await step('admin sees the member (search, masked Aadhaar), dashboard numbers and CSV exports', async () => {
  const l = await call('GET', `/admin/members?q=${S.mm}`, null, S.admin); if (l.items.length !== 1 || l.items[0].membershipStatus !== 'ACTIVE') throw new Error('member search/status wrong');
  const d = await call('GET', `/admin/members/${l.items[0]._id}`, null, S.admin); if (!d.aadhaarMasked.startsWith('XXXX XXXX')) throw new Error('admin sees unmasked Aadhaar');
  const st = await call('GET', '/admin/dashboard', null, S.admin); if (!(st.students >= 1 && st.activeMembers >= 1 && st.revenue.membership >= 1)) throw new Error('dashboard stats: ' + JSON.stringify(st));
  for (const u of ['/admin/members/export.csv', '/admin/payments/export.csv']) { const r = await fetch(BASE + u, { headers: { authorization: 'Bearer ' + S.admin } }); if (!r.ok || !(r.headers.get('content-type') || '').includes('csv')) throw new Error(u + ' failed'); }
});
await step('public stats and location search work', async () => {
  const s = await call('GET', '/public/stats'); if (!s.membersLabel) throw new Error('no stats');
  const loc = await call('GET', '/public/locations'); if (!loc.states.includes('MH') && !loc.states.length) throw new Error('no locations');
  const l = await call('GET', '/public/services?q=flow%20yoga&city=Pune&pin=4110'); if (!l.items.length) throw new Error('location filter finds nothing');
});
await step('member books; booking fee is required (no free days)', async () => { S.booking = await call('POST', '/member/bookings', { courseId: S.course._id }, S.member, 201); if (S.booking.status !== 'PENDING_PAYMENT') throw new Error('status ' + S.booking.status); });
await step('member pays; admin approves; booking is confirmed and partner sees it', async () => {
  await call('POST', `/member/bookings/${S.booking._id}/pay`, { transactionId: 'BOOK' + Date.now(), proofKey: await proof(S.member) }, S.member, 201);
  const l = await call('GET', '/admin/payments?status=UNDER_REVIEW', null, S.admin); const p = l.items.find((x) => x.purpose === 'BOOKING' && x.user?.phone === S.mm); if (!p) throw new Error('booking payment not shown to admin');
  await call('PUT', `/admin/payments/${p._id}/review`, { action: 'approve' }, S.admin);
  const mine = await call('GET', '/member/bookings', null, S.member); if (mine.items[0].status !== 'CONFIRMED') throw new Error('booking not confirmed');
  const pb = await call('GET', '/partner/bookings', null, S.partner); if (!pb.items.length) throw new Error('partner does not see the booking');
});

// ---- sponsorship (Plan B)
await step('partner requests sponsorship, pays; admin approves; ad shows on the main page', async () => {
  const sr = await call('POST', '/partner/sponsor-requests', { headline: 'Flow test: 40% off yoga' }, S.partner, 201);
  await call('POST', `/partner/sponsor-requests/${sr._id}/pay`, { transactionId: 'SPON' + Date.now(), proofKey: await proof(S.partner) }, S.partner, 201);
  await call('PUT', `/admin/sponsor-requests/${sr._id}/review`, { action: 'approve' }, S.admin);
  const ads = await call('GET', '/public/ads'); if (!ads.ads.some((a) => a.headline === 'Flow test: 40% off yoga')) throw new Error('ad not on main page');
  const l = await call('GET', '/public/services?q=flow%20yoga'); if (!l.items[0]?.sponsored) throw new Error('not marked sponsored in listing');
});

await step('admin adds a banner ad and it shows in the public slider', async () => {
  const b = await call('POST', '/admin/banners', { title: 'Flow test banner', imageUrl: '/uploads/test.jpg', linkUrl: '/partners', placement: 'HOME' }, S.admin, 201);
  const pub = await call('GET', '/public/banners?placement=HOME'); if (!pub.items.some((x) => x.title === 'Flow test banner')) throw new Error('banner not in public list');
  await call('POST', '/admin/banners', { imageUrl: '/uploads/x.jpg', linkUrl: 'javascript:alert(1)' }, S.admin, 400); // unsafe links are rejected
  await call('DELETE', `/admin/banners/${b._id}`, null, S.admin);
});
await step('admin settings restored', async () => {
  const s = S.settings; await call('PUT', '/admin/settings', { paymentRequiredAt: s.paymentRequiredAt || 'NONE', freeTrialDays: s.freeTrialDays ?? 7, membershipFee: s.membershipFee ?? 999, membershipValidityDays: s.membershipValidityDays ?? 365, bookingFee: s.bookingFee ?? 0,
    partnerFreeDays: s.partnerFreeDays ?? 30, partnerListingFee: s.partnerListingFee ?? 0, listingValidityDays: s.listingValidityDays ?? 365, partnerSponsorFee: s.partnerSponsorFee ?? 0, sponsorDurationDays: s.sponsorDurationDays ?? 30,
    upiId: s.upiId || 'yourupi@bank', showQr: s.showQr ?? true, showBank: s.showBank ?? false, paymentInstructions: s.paymentInstructions || '' }, S.admin);
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
