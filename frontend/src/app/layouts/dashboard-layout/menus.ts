import { Role } from '../../core/models/user.model';

export const MENUS: Record<Role, { label: string; path: string }[]> = {
  MEMBER: [{ label: 'Dashboard', path: 'dashboard' }, { label: 'Find Partner Institutes', path: 'services' }, { label: 'My Membership', path: 'membership' }, { label: 'My ID Card', path: 'id-card' },
    { label: 'My Bookings', path: 'bookings' }, { label: 'My Profile', path: 'profile' }],
  PARTNER: [{ label: 'Dashboard', path: 'dashboard' }, { label: 'Institution Profile', path: 'profile' }, { label: 'My Offerings & Fees', path: 'offerings' },
    { label: 'Plans & Payments', path: 'plans' }, { label: 'Bookings', path: 'bookings' }],
  ADMIN: [{ label: 'Dashboard', path: 'dashboard' }, { label: 'Members', path: 'members' }, { label: 'Membership Plans', path: 'plans' }, { label: 'Payments', path: 'payments' }, { label: 'Partners', path: 'partners' },
    { label: 'Offerings', path: 'offerings' }, { label: 'Banners (image ads)', path: 'banners' }, { label: 'Sponsor Requests', path: 'sponsor-requests' }, { label: 'Sponsors & Ads', path: 'sponsors' }, { label: 'Payment Settings', path: 'settings' }],
};
