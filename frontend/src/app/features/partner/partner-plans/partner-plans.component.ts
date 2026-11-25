import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PaymentFormComponent } from '../../../shared/components/payment-form/payment-form.component';
import { shrinkImage } from '../../../core/utils/image';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { PENDING_PAYMENT: 'Payment needed', PAYMENT_REVIEW: 'Verifying payment', PENDING_APPROVAL: 'Waiting for admin', ACTIVE: 'Live', REJECTED: 'Rejected', CANCELLED: 'Cancelled' };

@Component({ selector: 'ac-partner-plans', imports: [ReactiveFormsModule, PaymentFormComponent, CurrencyPipe, DatePipe], templateUrl: './partner-plans.component.html', styleUrl: './partner-plans.component.scss' })
export class PartnerPlansComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  d = signal<any>(null); error = signal(''); busy = signal(false); payingId = signal('');
  label = (s: string) => LABEL[s] || s;
  form = this.fb.nonNullable.group({ kind: ['BANNER'], headline: ['', [Validators.required, Validators.minLength(2)]], adText: [''], imageUrl: [''], mobileImageUrl: [''], linkUrl: ['', Validators.pattern(/^(https?:\/\/\S+|\/\S*)?$/)] });

  ngOnInit() { this.load(); }
  async load() { try { this.d.set(await this.api.get('/partner/plans')); } catch (e) { this.error.set(errText(e)); } }
  async pickImage(ev: Event, field: 'imageUrl' | 'mobileImageUrl' = 'imageUrl') {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.error.set('');
    try { const blob = await shrinkImage(f, field === 'imageUrl' ? 1600 : 900); this.form.patchValue({ [field]: (await this.api.upload(new File([blob], 'ad.jpg', { type: 'image/jpeg' }))).url } as any); } catch (e) { this.error.set(errText(e)); }
  }
  async request() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set('');
    const b: any = { ...this.form.getRawValue() }; for (const k of ['imageUrl', 'mobileImageUrl', 'adText', 'linkUrl']) if (!b[k]) delete b[k];
    if (b.kind === 'BANNER' && !b.imageUrl) { this.error.set('Please upload the banner image.'); this.busy.set(false); return; }
    try { const sr = await this.api.post('/partner/sponsor-requests', b); this.form.reset(); if (sr.status === 'PENDING_PAYMENT') this.payingId.set(sr._id); await this.load(); }
    catch (e) { this.error.set(errText(e)); } finally { this.busy.set(false); }
  }
  async cancel(sr: any) { if (!confirm('Cancel this request?')) return; try { await this.api.post(`/partner/sponsor-requests/${sr._id}/cancel`); await this.load(); } catch (e) { this.error.set(errText(e)); } }
  toggle(id: string) { this.payingId.set(this.payingId() === id ? '' : id); }
  async paid() { this.payingId.set(''); await this.load(); }
}
