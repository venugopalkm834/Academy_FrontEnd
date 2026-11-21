import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { homeFor, loginFor } from '../auth/auth.helpers';
import { Role } from '../models/user.model';
export const roleGuard = (role: Role): CanActivateFn => () => {
  const u = inject(AuthService).user();
  return u && u.role === role ? true : inject(Router).createUrlTree([loginFor(role)]);
};

// Login / register pages are only for visitors: a logged-in user goes straight to their dashboard.
export const guestGuard: CanActivateFn = () => {
  const u = inject(AuthService).user();
  return u ? inject(Router).createUrlTree([homeFor(u.role)]) : true;
};

// Partners list their own services; the member-facing Find Services pages are not shown to them.
export const notPartnerGuard: CanActivateFn = () => {
  const u = inject(AuthService).user();
  return u?.role === 'PARTNER' ? inject(Router).createUrlTree([homeFor('PARTNER')]) : true;
};
