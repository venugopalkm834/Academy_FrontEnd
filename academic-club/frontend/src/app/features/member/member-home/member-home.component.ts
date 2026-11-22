import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AccessService } from '../../../core/services/access.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SERVICE_TYPES } from '../../../core/models/service-types';
import { BannerSliderComponent } from '../../../shared/components/banner-slider/banner-slider.component';
import { AdStripComponent } from '../../../shared/components/ad-strip/ad-strip.component';

@Component({ selector: 'ac-member-home', imports: [AdStripComponent, BannerSliderComponent, RouterLink, CurrencyPipe], templateUrl: './member-home.component.html', styleUrl: './member-home.component.scss' })
export class MemberHomeComponent implements OnInit {
  private svc = inject(AccessService);
  acc = signal<any>(null);
  async ngOnInit() { try { this.acc.set(await this.svc.load()); } catch { /* banner is optional */ } }
  auth = inject(AuthService);
  private router = inject(Router);
  types = SERVICE_TYPES; q = signal('');
  go() { this.router.navigate(['/member/services'], { queryParams: { q: this.q() || null } }); }
  pick(type: string) { this.router.navigate(['/member/services'], { queryParams: { type } }); }
}
