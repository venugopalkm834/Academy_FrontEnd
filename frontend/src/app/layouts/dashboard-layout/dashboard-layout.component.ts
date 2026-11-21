import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Role } from '../../core/models/user.model';
import { MENUS } from './menus';

@Component({
  selector: 'ac-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  auth = inject(AuthService); open = false;
  role = inject(ActivatedRoute).snapshot.data['role'] as Role;
  menu = MENUS[this.role];
}
