import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AccessService } from '../../../core/services/access.service';
import { ApiService } from '../../../core/services/api.service';
import { typeInfo } from '../../../core/models/service-types';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-sponsor-detail', imports: [RouterLink, CurrencyPipe], templateUrl: './sponsor-detail.component.html', styleUrl: './sponsor-detail.component.scss' })
export class SponsorDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  private access = inject(AccessService);
  d = signal<any>(null); error = signal(''); acc = signal<any>(null); booking = signal('');
  icon = (t: string) => typeInfo(t).icon;
  label = (t: string) => typeInfo(t).label;
  mapUrl = (i: any) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([i.name, i.address, i.city].filter(Boolean).join(', '));
  async ngOnInit() {
    try { this.d.set(await this.api.get('/public/services/' + this.route.snapshot.paramMap.get('id'))); }
    catch (e) { this.error.set(errText(e)); }
    if (this.auth.user()?.role === 'MEMBER') { try { this.acc.set(await this.access.load()); } catch { /* optional */ } }
  }
  async book(o: any) {
    this.error.set(''); this.booking.set(o.id);
    try {
      const b = await this.api.post('/member/bookings', { courseId: o.id });
      this.router.navigate(['/member/bookings'], { queryParams: { pay: b.status === 'PENDING_PAYMENT' ? b._id : null } });
    } catch (e: any) {
      if (e?.status === 402) this.router.navigate(['/member/membership']);
      else this.error.set(errText(e));
    } finally { this.booking.set(''); }
  }
}
