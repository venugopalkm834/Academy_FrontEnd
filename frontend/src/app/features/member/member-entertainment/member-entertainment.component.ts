import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PaymentFormComponent } from '../../../shared/components/payment-form/payment-form.component';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { PENDING_PAYMENT: 'Payment needed', PAYMENT_REVIEW: 'Verifying payment', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled' };

@Component({ selector: 'ac-member-entertainment', imports: [PaymentFormComponent, CurrencyPipe, DatePipe, DecimalPipe], templateUrl: './member-entertainment.component.html', styleUrl: './member-entertainment.component.scss' })
export class MemberEntertainmentComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  @ViewChild('mine') mine?: ElementRef<HTMLElement>;
  events = signal<any[]>([]); bookings = signal<any[]>([]); qty = signal<Record<string, number>>({}); highlight = signal('');
  payingId = signal(''); busy = signal(''); error = signal(''); msg = signal(''); loading = signal(true);
  label = (s: string) => LABEL[s] || s;
  async ngOnInit() {
    this.highlight.set(this.route.snapshot.queryParamMap.get('book') || '');
    await this.load();
    if (this.highlight()) setTimeout(() => document.getElementById('ev-' + this.highlight())?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  }
  async load() {
    this.loading.set(true);
    try { this.events.set((await this.api.get('/public/entertainment')).items); this.bookings.set((await this.api.get('/member/entertainment/bookings')).items); }
    catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  q(id: string) { return this.qty()[id] || 1; }
  setQty(id: string, v: string, max: number) { this.qty.update((m) => ({ ...m, [id]: Math.max(1, Math.min(max, +v || 1)) })); }
  async book(e: any) {
    this.error.set(''); this.msg.set(''); this.busy.set(e.id);
    try {
      const b = await this.api.post('/member/entertainment/bookings', { entertainmentId: e.id, qty: this.q(e.id) });
      this.msg.set(b.status === 'CONFIRMED' ? 'Booking confirmed!' : 'Booking created. Complete the payment below and upload your screenshot.');
      if (b.status === 'PENDING_PAYMENT') this.payingId.set(b._id);
      await this.load(); setTimeout(() => this.mine?.nativeElement.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err: any) {
      if (err?.status === 402) this.router.navigate(['/member/membership']); else this.error.set(errText(err));
    } finally { this.busy.set(''); }
  }
  toggle(id: string) { this.payingId.set(this.payingId() === id ? '' : id); }
  async paid() { this.payingId.set(''); this.msg.set('Payment submitted. The admin will verify it and confirm your booking.'); await this.load(); }
  async cancel(b: any) { if (!confirm('Cancel this booking?')) return; try { await this.api.post(`/member/entertainment/bookings/${b._id}/cancel`); await this.load(); } catch (e) { this.error.set(errText(e)); } }
}
