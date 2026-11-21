import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PaymentFormComponent } from '../../../shared/components/payment-form/payment-form.component';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { PENDING_PAYMENT: 'Payment needed', PAYMENT_REVIEW: 'Verifying payment', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled' };

@Component({ selector: 'ac-member-bookings', imports: [PaymentFormComponent, CurrencyPipe, DatePipe, RouterLink], templateUrl: './member-bookings.component.html', styleUrl: './member-bookings.component.scss' })
export class MemberBookingsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  items = signal<any[]>([]); loading = signal(true); error = signal(''); payingId = signal('');
  label = (s: string) => LABEL[s] || s;
  ngOnInit() { this.payingId.set(this.route.snapshot.queryParamMap.get('pay') || ''); this.load(); }
  async load() {
    this.loading.set(true); this.payingId.set(this.payingId());
    try { this.items.set((await this.api.get('/member/bookings')).items); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  toggle(id: string) { this.payingId.set(this.payingId() === id ? '' : id); }
  async done() { this.payingId.set(''); await this.load(); }
  async cancel(b: any) { if (!confirm('Cancel this booking?')) return; try { await this.api.post(`/member/bookings/${b._id}/cancel`); await this.load(); } catch (e) { this.error.set(errText(e)); } }
}
