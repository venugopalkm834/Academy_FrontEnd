const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Standard`;
export const EDU_LEVELS = [
  { value: 'LKG', label: 'LKG', group: 'LKG_SSLC' }, { value: 'UKG', label: 'UKG', group: 'LKG_SSLC' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `STD_${i + 1}`, label: i === 9 ? '10th Standard (SSLC)' : ord(i + 1), group: 'LKG_SSLC' })),
  { value: 'PUC', label: 'PUC / 12th', group: 'PUC_DEGREE' }, { value: 'DIPLOMA', label: 'Diploma', group: 'PUC_DEGREE' },
  { value: 'UG', label: 'Undergraduate Degree', group: 'PUC_DEGREE' }, { value: 'PG', label: 'Postgraduate Degree', group: 'PUC_DEGREE' }, { value: 'OTHER', label: 'Other', group: 'PUC_DEGREE' },
];
export const groupOf = (level: string) => EDU_LEVELS.find((e) => e.value === level)?.group ?? '';
export const groupLabel = (g: string) => (g === 'LKG_SSLC' ? 'LKG to SSLC plans' : g === 'PUC_DEGREE' ? 'PUC to Degree plans' : '');
export const INDIA_STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
