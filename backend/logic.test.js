const {computeAccess}=require('./dist/services/access.js'); const {calcPrice}=require('./dist/services/pricing.js'); const assert=require('assert');
const now=new Date('2026-11-12T00:00:00Z'), d=(n)=>new Date(now.getTime()+n*864e5);
const A=(s,m)=>computeAccess(s,m,now);
// NONE: nothing required
let a=A({paymentRequiredAt:'NONE'},{status:'NONE',trialEndsAt:d(-5)}); assert(!a.needsMembershipPayment&&!a.bookingPaymentRequired);
// REGISTRATION: in trial free, after trial must pay, active ok, expired must pay
a=A({paymentRequiredAt:'REGISTRATION',membershipFee:999},{status:'NONE',trialEndsAt:d(3)}); assert(a.inTrial&&a.daysLeft===3&&!a.needsMembershipPayment);
a=A({paymentRequiredAt:'REGISTRATION'},{status:'NONE',trialEndsAt:d(-1)}); assert(a.needsMembershipPayment);
a=A({paymentRequiredAt:'REGISTRATION'},{status:'ACTIVE',expiresAt:d(100),trialEndsAt:d(-1)}); assert(a.membershipActive&&!a.needsMembershipPayment);
a=A({paymentRequiredAt:'REGISTRATION'},{status:'ACTIVE',expiresAt:d(-1),trialEndsAt:d(-30)}); assert(!a.membershipActive&&a.needsMembershipPayment&&a.membershipStatus==='EXPIRED');
// zero free days => trial never applies
a=A({paymentRequiredAt:'REGISTRATION'},{status:'NONE',trialEndsAt:now}); assert(a.needsMembershipPayment);
// BOOKING: free in trial, fee after
a=A({paymentRequiredAt:'BOOKING',bookingFee:199},{status:'NONE',trialEndsAt:d(2)}); assert(!a.bookingPaymentRequired);
a=A({paymentRequiredAt:'BOOKING',bookingFee:199},{status:'NONE',trialEndsAt:d(-2)}); assert(a.bookingPaymentRequired&&!a.needsMembershipPayment);
// pricing: 10% vs 40% => 40%, 10000 -> 6000 + fees
let p=calcPrice({originalFee:10000,institutionPct:10,clubPct:40,admissionFee:500,additionalFees:250}); assert.strictEqual(p.effectivePct,40); assert.strictEqual(p.finalFee,6000+500+250);
p=calcPrice({originalFee:10000,institutionPct:10,clubPct:40,stacking:true,cap:50}); assert.strictEqual(p.effectivePct,50);
const {computeListing}=require('./dist/services/access.js');
let l=computeListing({partnerListingFee:0},{trialEndsAt:d(-5)},now); assert(l.listed&&!l.needsPayment);                       // free listing
l=computeListing({partnerListingFee:500},{trialEndsAt:d(10)},now); assert(l.inTrial&&l.listed&&!l.needsPayment&&l.daysLeft===10); // free days
l=computeListing({partnerListingFee:500},{trialEndsAt:d(-1)},now); assert(!l.listed&&l.needsPayment);                           // must pay
l=computeListing({partnerListingFee:500},{trialEndsAt:d(-1),listingStatus:'ACTIVE',listingExpiresAt:d(30)},now); assert(l.listed&&l.active&&!l.needsPayment);
l=computeListing({partnerListingFee:500},{trialEndsAt:d(-1),listingStatus:'ACTIVE',listingExpiresAt:d(-1)},now); assert(!l.listed&&l.status==='EXPIRED');
const {validAadhaar}=require('./dist/services/aadhaar.js');
const D=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]],INV=[0,4,3,2,1,5,6,7,8,9];
const make=(p)=>{let c=0;p.split('').reverse().map(Number).forEach((x,i)=>{c=D[c][P[(i+1)%8][x]];});return p+INV[c];};
for(let i=0;i<200;i++){const p=String(2+Math.floor(Math.random()*8))+String(Math.floor(Math.random()*1e10)).padStart(10,'0'); const n=make(p); assert(validAadhaar(n),'generated '+n); const bad=n.slice(0,11)+((+n[11]+1)%10); assert(!validAadhaar(bad),'should fail '+bad);}
assert(!validAadhaar('123412341234')&&!validAadhaar('12345')&&!validAadhaar('abcdefghijkl')); // wrong first digit / length / chars
console.log('aadhaar validation ok');
console.log('logic tests passed');
