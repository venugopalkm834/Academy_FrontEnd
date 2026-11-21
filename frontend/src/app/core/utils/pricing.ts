// Mirrors backend services/pricing.ts (discount stacking off): the higher of partner offer and club offer applies.
const r2 = (n: number) => Math.round(n * 100) / 100;
export function calcPrice(o: { originalFee: number; institutionPct: number; clubPct: number; admissionFee: number; additionalFees: number }) {
  const effectivePct = Math.min(100, Math.max(o.institutionPct, o.clubPct, 0));
  const discountAmount = r2((o.originalFee * effectivePct) / 100);
  return { originalFee: o.originalFee, effectivePct, discountAmount, admissionFee: o.admissionFee, additionalFees: o.additionalFees,
    finalFee: r2(o.originalFee - discountAmount + o.admissionFee + o.additionalFees), savings: discountAmount };
}
