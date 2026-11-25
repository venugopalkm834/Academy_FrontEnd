import { Role } from '../../core/models/user.model';

export interface MenuItem { label: string; path: string; icon: string }
export const MENUS: Record<Role, MenuItem[]> = {
  MEMBER: [{ label: 'Dashboard', path: 'dashboard', icon: '🏠' }, { label: 'Find Partner Institutes', path: 'services', icon: '🔎' }, { label: 'My Membership', path: 'membership', icon: '🪪' }, { label: 'My ID Card', path: 'id-card', icon: '🆔' },
    { label: 'Club Entertainment', path: 'entertainment', icon: '🎭' }, { label: 'My Bookings', path: 'bookings', icon: '📅' }, { label: 'My Profile', path: 'profile', icon: '👤' }, { label: 'Help & Contact', path: 'help', icon: '💬' }],
  PARTNER: [{ label: 'Dashboard', path: 'dashboard', icon: '🏠' }, { label: 'Academy Profile', path: 'profile', icon: '🏫' }, { label: 'My Offerings & Fees', path: 'offerings', icon: '📚' }, { label: 'Plans, Ads & Payments', path: 'plans', icon: '💳' },
    { label: 'Bookings', path: 'bookings', icon: '📅' }, { label: 'Help & Contact', path: 'help', icon: '💬' }],
  ADMIN: [{ label: 'Dashboard', path: 'dashboard', icon: '🏠' }, { label: 'Members', path: 'members', icon: '👥' }, { label: 'Payments', path: 'payments', icon: '💰' }, { label: 'Partners (Academies)', path: 'partners', icon: '🏫' },
    { label: 'Membership Plans', path: 'plans', icon: '🪪' }, { label: 'Offerings', path: 'offerings', icon: '📚' }, { label: 'Club Entertainment', path: 'entertainment', icon: '🎭' }, { label: 'Banners (image ads)', path: 'banners', icon: '🖼' }, { label: 'Ad Requests', path: 'sponsor-requests', icon: '📣' },
    { label: 'Sponsors & Ads', path: 'sponsors', icon: '⭐' }, { label: 'Contact & Email Settings', path: 'site', icon: '☎️' }, { label: 'Email Templates', path: 'emails', icon: '✉️' }, { label: 'Payment Settings', path: 'settings', icon: '⚙️' }],
};
