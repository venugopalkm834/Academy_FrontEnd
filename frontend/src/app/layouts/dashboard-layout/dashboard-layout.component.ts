import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APP_VERSION } from '../../core/config/version';
import { Role } from '../../core/models/user.model';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { WhatsappFabComponent } from '../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { MENUS } from './menus';

@Component({
  selector: 'ac-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent, WhatsappFabComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  auth = inject(AuthService);
  open = false;
  version = APP_VERSION;
  role = inject(ActivatedRoute).snapshot.data['role'] as Role;
  menu = MENUS[this.role];
  bottom = MENUS[this.role].slice(0, 4); // the four main items sit in the phone bottom bar, the rest under "More"
  private shortNames: Record<string, string> = { dashboard: 'Home', services: 'Find', membership: 'Membership', 'id-card': 'ID card', profile: 'Profile', offerings: 'Offerings', plans: 'Plans', bookings: 'Bookings',
    members: 'Members', payments: 'Payments', partners: 'Academies' };
  short = (m: { path: string; label: string }) => this.shortNames[m.path] || m.label;
  roleName = this.role === 'PARTNER' ? 'ACADEMY' : this.role;
}
