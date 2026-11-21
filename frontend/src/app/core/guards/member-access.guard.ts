import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessService } from '../services/access.service';

// When the admin requires a membership fee at registration, members whose free days are over go to the payment page.
export const memberAccessGuard: CanActivateFn = async () => {
  const svc = inject(AccessService), router = inject(Router);
  try { return (await svc.load()).needsMembershipPayment ? router.createUrlTree(['/member/membership']) : true; } catch { return true; }
};
