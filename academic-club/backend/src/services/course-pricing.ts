import { AdminSettings } from '../models';
import { calcPrice } from './pricing';
export async function applyPrice(c: any) {
  const s: any = await AdminSettings.findOne({ key: 'global' }).lean();
  const p = calcPrice({ originalFee: c.originalFee, institutionPct: c.institutionDiscountPct, clubPct: c.clubDiscountPct, admissionFee: c.admissionFee, additionalFees: c.additionalFees, stacking: s?.discountStacking, cap: s?.discountCap });
  c.effectivePct = p.effectivePct; c.discountAmount = p.discountAmount; c.finalFee = p.finalFee;
}
