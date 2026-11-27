import { SERVICE_TYPES } from '../../../core/models/service-types';

// Field definitions that drive the member and partner registration forms.
export interface Field { name: string; label: string; type: string; full?: boolean; options?: { value: string; label: string }[]; optional?: boolean; pattern?: RegExp; hint?: string }
const common: Field[] = [
  { name: 'email', label: 'Email ID (for notifications and password reset)', type: 'email', hint: 'Enter a valid email address' }, { name: 'phone', label: 'Mobile number (used to log in)', type: 'tel', pattern: /^[6-9]\d{9}$/, hint: 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9' },
];
const addr: Field[] = [
  { name: 'address', label: 'Address', type: 'text', full: true }, { name: 'city', label: 'City', type: 'text' }, { name: 'district', label: 'District', type: 'text' }, { name: 'state', label: 'State', type: 'text' },
  { name: 'pin', label: 'PIN Code', type: 'text', pattern: /^\d{6}$/, hint: '6 digits' },
];
const pass: Field[] = [
  { name: 'password', label: 'Password', type: 'password', hint: 'Min 8 chars, 1 uppercase, 1 number' }, { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
];
export const CFG = {
  member: { title: 'Become a Member', done: 'Registered! Check your email to verify your account, then log in.', checks: true, fields: [
    { name: 'firstName', label: 'First Name', type: 'text' }, { name: 'lastName', label: 'Last Name', type: 'text' }, ...common,
    { name: 'dob', label: 'Date of Birth', type: 'date' }, { name: 'qualification', label: 'Education Qualification', type: 'text' },
    { name: 'school', label: 'Current School / College', type: 'text', optional: true }, ...addr, ...pass] as Field[] },
  partner: { title: 'Partner / Institution Registration', done: 'Registration received. Your account is pending admin approval.', checks: false, fields: [
    { name: 'institutionName', label: 'Institution Name', type: 'text' },
    { name: 'institutionType', label: 'Institution Type (school, college, training, dance, yoga, other…)', type: 'select', options: SERVICE_TYPES },
    { name: 'contactName', label: 'Owner / Contact Person', type: 'text' }, ...common,
    { name: 'altPhone', label: 'Alternate mobile', type: 'tel', optional: true, pattern: /^[6-9]\d{9}$/, hint: 'Enter a valid 10-digit mobile number' }, ...addr,
    { name: 'website', label: 'Website (https://…)', type: 'url', optional: true }, ...pass] as Field[] },
};
