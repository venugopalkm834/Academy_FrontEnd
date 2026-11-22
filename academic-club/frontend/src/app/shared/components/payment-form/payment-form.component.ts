import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

// Shows the admin's payment details (QR / UPI / bank) and collects the transaction ID + screenshot for manual verification.
@Component({ selector: 'ac-payment-form', imports: [ReactiveFormsModule, CurrencyPipe], templateUrl: './payment-form.component.html', styleUrl: './payment-form.component.scss' })
export class PaymentFormComponent implements OnInit {
  @Input() payUrl = '';
  @Input() extra: Record<string, any> = {}; // extra fields sent with the payment, e.g. { planId } // endpoint that records the payment, e.g. /member/bookings/ID/pay
  @Input() amount = 0;
  @Output() paid = new EventEmitter<void>();
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  info = signal<any>(null); proofName = signal(''); err = signal(''); busy = signal(false); copied = signal('');
  private proofKey = '';
  form = this.fb.nonNullable.group({ transactionId: ['', [Validators.required, Validators.minLength(6)]] });

  async ngOnInit() { try { this.info.set(await this.api.get('/payments/info')); } catch (e) { this.err.set(errText(e)); } }
  bankRows(i: any): string[][] {
    const b = i?.bank || {};
    return [['Account name', b.accountName], ['Bank', b.bankName], ['Account number', b.accountNumber], ['IFSC', b.ifsc], ['Branch', b.branch]].filter((r) => r[1]);
  }
  async copy(text: string) { try { await navigator.clipboard.writeText(text); this.copied.set(text); setTimeout(() => this.copied.set(''), 1500); } catch { /* clipboard unavailable */ } }
  async pick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set('');
    try { this.proofKey = (await this.api.upload(f, 'proof')).key; this.proofName.set(f.name); } catch (e) { this.err.set(errText(e)); }
  }
  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.err.set('Enter the transaction / UTR ID (at least 6 characters).'); return; }
    if (!this.proofKey) { this.err.set('Please upload your payment screenshot.'); return; }
    this.busy.set(true); this.err.set('');
    const body = { ...this.extra, transactionId: this.form.getRawValue().transactionId.trim(), proofKey: this.proofKey };
    try {
      await this.api.post(this.payUrl, body);
      this.paid.emit();
    } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
