import { Route, Routes } from '@angular/router';
import { roleGuard, guestGuard, notPartnerGuard } from './core/guards/role.guard';
import { Role } from './core/models/user.model';
import { memberAccessGuard } from './core/guards/member-access.guard';

const info = (title: string, body: string[]): Route => ({ data: { title, body }, path: title.toLowerCase().split(' ')[0],
  loadComponent: () => import('./shared/components/info-page/info-page.component').then((m) => m.InfoPageComponent) });
const login = (role: Role) => ({ canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent), data: { role } });
const register = (kind: string) => ({ canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent), data: { kind } });
const memberRegister = { canActivate: [guestGuard], loadComponent: () => import('./features/auth/member-register/member-register.component').then((m) => m.MemberRegisterComponent) };
const account = (mode: string) => ({ loadComponent: () => import('./features/auth/account-links/account-links.component').then((m) => m.AccountLinksComponent), data: { mode } });

// Used for /partners (public) and /member/sponsors (member panel): list + detail
const sponsorPages: Routes = [
  { path: '', loadComponent: () => import('./features/sponsors/sponsors-list/sponsors-list.component').then((m) => m.SponsorsListComponent) },
  { path: ':id', loadComponent: () => import('./features/sponsors/sponsor-detail/sponsor-detail.component').then((m) => m.SponsorDetailComponent) },
];
const page = (path: string, load: () => Promise<any>): Route => ({ path, loadComponent: load });
const dash = (role: Role, children: Routes): Route => ({
  path: role.toLowerCase(), canActivate: [roleGuard(role)], data: { role },
  loadComponent: () => import('./layouts/dashboard-layout/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
  children: [{ path: '', pathMatch: 'full', redirectTo: 'dashboard' }, ...children],
});

export const routes: Routes = [
  { path: '', loadComponent: () => import('./layouts/public-layout/public-layout.component').then((m) => m.PublicLayoutComponent), children: [
    { path: '', pathMatch: 'full', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
    { path: 'login', ...login('MEMBER') }, { path: 'partner/login', ...login('PARTNER') }, { path: 'academy/login', ...login('PARTNER') }, { path: 'admin/login', ...login('ADMIN') },
    { path: 'member/register', ...memberRegister },
    page('verify/:code', () => import('./features/verify/verify-member/verify-member.component').then((m) => m.VerifyMemberComponent)), { path: 'partner/register', ...register('partner') },
    { path: 'forgot-password', ...account('forgot') }, { path: 'reset-password', ...account('reset') }, { path: 'verify-email', ...account('verify') },
    { path: 'partners', canActivate: [notPartnerGuard], children: sponsorPages },
    info('About Us', ['The Academic Club connects students and families with trusted schools, colleges, training institutes and activity centres, and brings exclusive member discounts on their courses.', 'Institutions register, publish their offerings and fee structures, and are reviewed by our team before going live.']),
    info('Events', ['No events are published yet. Please check back soon.']),
    { path: 'contact', data: { title: 'Contact Us' }, loadComponent: () => import('./features/contact/contact-info.component').then((m) => m.ContactInfoComponent) },
  ] },
  dash('MEMBER', [
    page('dashboard', () => import('./features/member/member-home/member-home.component').then((m) => m.MemberHomeComponent)),
    { path: 'services', canActivate: [memberAccessGuard], children: sponsorPages },
    { path: 'help', data: { title: 'Help & Contact' }, loadComponent: () => import('./features/contact/contact-info.component').then((m) => m.ContactInfoComponent) },
    page('entertainment', () => import('./features/member/member-entertainment/member-entertainment.component').then((m) => m.MemberEntertainmentComponent)),
    page('id-card', () => import('./features/member/member-id-card/member-id-card.component').then((m) => m.MemberIdCardComponent)),
    page('profile', () => import('./features/member/member-profile/member-profile.component').then((m) => m.MemberProfileComponent)),
    page('bookings', () => import('./features/member/member-bookings/member-bookings.component').then((m) => m.MemberBookingsComponent)),
    page('membership', () => import('./features/member/member-membership/member-membership.component').then((m) => m.MemberMembershipComponent)),
  ]),
  dash('PARTNER', [
    page('dashboard', () => import('./features/partner/partner-home/partner-home.component').then((m) => m.PartnerHomeComponent)),
    page('profile', () => import('./features/partner/partner-profile/partner-profile.component').then((m) => m.PartnerProfileComponent)),
    { path: 'help', data: { title: 'Help & Contact' }, loadComponent: () => import('./features/contact/contact-info.component').then((m) => m.ContactInfoComponent) },
    page('plans', () => import('./features/partner/partner-plans/partner-plans.component').then((m) => m.PartnerPlansComponent)),
    page('bookings', () => import('./features/partner/partner-bookings/partner-bookings.component').then((m) => m.PartnerBookingsComponent)),
    { path: 'offerings', children: [
      page('', () => import('./features/partner/partner-offerings/partner-offerings.component').then((m) => m.PartnerOfferingsComponent)),
      page('new', () => import('./features/partner/partner-offering-form/partner-offering-form.component').then((m) => m.PartnerOfferingFormComponent)),
      page(':id', () => import('./features/partner/partner-offering-form/partner-offering-form.component').then((m) => m.PartnerOfferingFormComponent)),
    ] },
  ]),
  dash('ADMIN', [
    page('dashboard', () => import('./features/admin/admin-home/admin-home.component').then((m) => m.AdminHomeComponent)),
    page('service-types', () => import('./features/admin/admin-service-types/admin-service-types.component').then((m) => m.AdminServiceTypesComponent)),
    page('partners', () => import('./features/admin/admin-partners/admin-partners.component').then((m) => m.AdminPartnersComponent)),
    page('offerings', () => import('./features/admin/admin-offerings/admin-offerings.component').then((m) => m.AdminOfferingsComponent)),
    page('sponsor-requests', () => import('./features/admin/admin-sponsor-requests/admin-sponsor-requests.component').then((m) => m.AdminSponsorRequestsComponent)),
    page('sponsors', () => import('./features/admin/admin-sponsors/admin-sponsors.component').then((m) => m.AdminSponsorsComponent)),
    page('site', () => import('./features/admin/admin-site/admin-site.component').then((m) => m.AdminSiteComponent)),
    page('emails', () => import('./features/admin/admin-email-templates/admin-email-templates.component').then((m) => m.AdminEmailTemplatesComponent)),
    page('entertainment', () => import('./features/admin/admin-entertainment/admin-entertainment.component').then((m) => m.AdminEntertainmentComponent)),
    page('banners', () => import('./features/admin/admin-banners/admin-banners.component').then((m) => m.AdminBannersComponent)),
    page('plans', () => import('./features/admin/admin-plans/admin-plans.component').then((m) => m.AdminPlansComponent)),
    page('members', () => import('./features/admin/admin-members/admin-members.component').then((m) => m.AdminMembersComponent)),
    page('payments', () => import('./features/admin/admin-payments/admin-payments.component').then((m) => m.AdminPaymentsComponent)),
    page('settings', () => import('./features/admin/admin-settings/admin-settings.component').then((m) => m.AdminSettingsComponent)),
  ]),
  { path: '**', redirectTo: '' },
];
