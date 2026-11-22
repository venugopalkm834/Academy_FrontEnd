const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Standard`;
export const EDU_LEVELS: { value: string; label: string; group: 'LKG_SSLC' | 'PUC_DEGREE' }[] = [
  { value: 'LKG', label: 'LKG', group: 'LKG_SSLC' }, { value: 'UKG', label: 'UKG', group: 'LKG_SSLC' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `STD_${i + 1}`, label: i === 9 ? '10th Standard (SSLC)' : ord(i + 1), group: 'LKG_SSLC' as const })),
  { value: 'PUC', label: 'PUC / 12th', group: 'PUC_DEGREE' }, { value: 'DIPLOMA', label: 'Diploma', group: 'PUC_DEGREE' },
  { value: 'UG', label: 'Undergraduate Degree', group: 'PUC_DEGREE' }, { value: 'PG', label: 'Postgraduate Degree', group: 'PUC_DEGREE' }, { value: 'OTHER', label: 'Other', group: 'PUC_DEGREE' },
];
export const EDU_LABEL: Record<string, string> = Object.fromEntries(EDU_LEVELS.map((e) => [e.value, e.label]));
export const educationGroup = (v: string) => EDU_LEVELS.find((e) => e.value === v)?.group ?? 'PUC_DEGREE';
