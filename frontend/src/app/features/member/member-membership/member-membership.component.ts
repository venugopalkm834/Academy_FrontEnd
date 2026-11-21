import { Component, NgZone, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AccessService } from '../../../core/services/access.service';
import { PaymentFormComponent } from '../../../shared/components/payment-form/payment-form.component';
import { loadRazorpay } from '../../../core/utils/razorpay';
import { groupLabel } from '../../../core/models/education';
import { errText } from '../../../core/utils/error.util';

const PAY: Record<string, string> = { APPROVED: 'Successful', CREATED: 'Pending', UNDER_REVIEW: 'Verifying', REJECTED: 'Rejected', FAILED: 'Failed', REFUNDED: 'Refunded' };

@Component({ selector: 'ac-member-membership', imports: [PaymentFormComponent, CurrencyPipe, DatePipe, RouterLink], templateUrl: './member-membership.component.html', styleUrl: './member-membership.component.scss' })
export class MemberMembershipComponent implements OnInit {
  private api = inject(ApiService);
  private access = inject(AccessService);
  private zone = inject(NgZone);
  d = signal<any>(null); payments = signal<any[]>([]); msg = signal(''); error = signal(''); busy = signal(''); manual = signal('');
  label = (s: string) => PAY[s] || s;
  group = groupLabel;
  ngOnInit() { this.load(); }
  async load() {
    try { this.d.set(await this.api.get('/member/plans')); this.payments.set((await this.api.get('/member/payments')).items.filter((p: any) => p.purpose === 'MEMBERSHIP')); await this.access.load(); }
    catch (e) { this.error.set(errText(e)); }
  }
  underReview() { return this.payments().some((p) => p.status === 'UNDER_REVIEW'); }
  async payOnline(plan: any) {
    this.error.set(''); this.msg.set(''); this.busy.set(plan._id);
    try {
      const o = await this.api.post('/member/membership/checkout', { planId: plan._id });
      if (o.free) { this.msg.set(o.message); this.busy.set(''); await this.load(); return; }
      await loadRazorpay();
      const rz = new window.Razorpay({
        key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: 'The Academic Club', description: o.planName, prefill: o.prefill, theme: { color: '#062B55' },
        // The browser only reports the result. The server checks the signature with the gateway before activating anything.
        handler: (r: any) => this.zone.run(async () => { try { this.msg.set((await this.api.post('/member/membership/verify', r)).message); } catch (e) { this.error.set(errText(e)); } this.busy.set(''); await this.load(); }),
        modal: { ondismiss: () => this.zone.run(() => this.busy.set('')) },
      });
      rz.on('payment.failed', (r: any) => this.zone.run(() => { this.error.set(r?.error?.description || 'The payment failed. Please try again.'); this.busy.set(''); }));
      rz.open();
    } catch (e) { this.error.set(errText(e)); this.busy.set(''); }
  }
  toggle(id: string) { this.manual.set(this.manual() === id ? '' : id); }
  async paidManual() { this.manual.set(''); this.msg.set('Payment submitted. The admin will verify it and activate your membership.'); await this.load(); }
}
