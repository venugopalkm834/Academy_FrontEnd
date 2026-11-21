import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-settings', imports: [ReactiveFormsModule], templateUrl: './admin-settings.component.html', styleUrl: './admin-settings.component.scss' })
export class AdminSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  msg = signal(''); err = signal(''); busy = signal(false);
  form = this.fb.nonNullable.group({
    paymentRequiredAt: ['NONE'], freeTrialDays: [7, [Validators.required, Validators.min(0)]],
    partnerFreeDays: [30, Validators.min(0)], partnerListingFee: [0, Validators.min(0)], listingValidityDays: [365, Validators.min(1)], partnerSponsorFee: [0, Validators.min(0)], sponsorDurationDays: [30, Validators.min(1)],
    membershipFee: [0, Validators.min(0)], membershipValidityDays: [365, [Validators.required, Validators.min(1)]], bookingFee: [0, Validators.min(0)],
    requireAadhaar: [true], statsMembersOverride: [0, Validators.min(0)], statsInstitutesOverride: [0, Validators.min(0)],
    upiId: [''], upiQrUrl: [''], showQr: [true], showBank: [false], paymentInstructions: [''],
    bank: this.fb.nonNullable.group({ accountName: [''], bankName: [''], accountNumber: [''], ifsc: [''], branch: [''] }),
  });
  async ngOnInit() {
    try {
      const s = await this.api.get('/admin/settings');
      const v: any = {}; for (const k of Object.keys(this.form.controls)) if (s[k] !== undefined && s[k] !== null) v[k] = s[k];
      this.form.patchValue(v);
    } catch (e) { this.err.set(errText(e)); }
  }
  async pickQr(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set('');
    try { this.form.patchValue({ upiQrUrl: (await this.api.upload(f)).url }); } catch (e) { this.err.set(errText(e)); }
  }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.err.set('Please fix the highlighted fields.'); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    try { await this.api.put('/admin/settings', this.form.getRawValue()); this.msg.set('Settings saved. They apply to members immediately.'); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
