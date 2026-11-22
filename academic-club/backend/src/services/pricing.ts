export interface PriceInput { originalFee: number; institutionPct: number; clubPct: number; admissionFee?: number; additionalFees?: number; stacking?: boolean; cap?: number }
export interface PriceResult { effectivePct: number; discountAmount: number; admissionFee: number; additionalFees: number; finalFee: number; savings: number }
const r2 = (n: number) => Math.round(n * 100) / 100;
export function calcPrice(i: PriceInput): PriceResult {
  const inst = Math.min(Math.max(i.institutionPct || 0, 0), 100), club = Math.min(Math.max(i.clubPct || 0, 0), 100);
  const effectivePct = i.stacking ? Math.min(inst + club, i.cap ?? 100) : Math.max(inst, club);
  const discountAmount = r2((i.originalFee * effectivePct) / 100);
  const admissionFee = i.admissionFee || 0, additionalFees = i.additionalFees || 0;
  return { effectivePct, discountAmount, admissionFee, additionalFees, finalFee: r2(i.originalFee - discountAmount + admissionFee + additionalFees), savings: discountAmount };
}
