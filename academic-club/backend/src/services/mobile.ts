import { z } from 'zod';
// Indian mobile numbers: 10 digits starting with 6-9. Accepts +91 / 91 / 0 prefixes and spaces, stores the plain 10 digits.
export const normMobile = (v: string) => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
};
export const mobileField = z.string().transform(normMobile).pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9)'));
