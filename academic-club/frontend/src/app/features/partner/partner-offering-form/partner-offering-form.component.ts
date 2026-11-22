import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_TYPES } from '../../../core/models/service-types';
import { calcPrice } from '../../../core/utils/pricing';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-partner-offering-form', imports: [ReactiveFormsModule, RouterLink, CurrencyPipe], templateUrl: './partner-offering-form.component.html', styleUrl: './partner-offering-form.component.scss' })
export class PartnerOfferingFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  id = inject(ActivatedRoute).snapshot.paramMap.get('id'); // null = new offering
  types = SERVICE_TYPES; clubPct = 0; status = '';
  rows = new FormArray<FormGroup>([]);
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]], serviceType: [''], className: [''], duration: [''], seats: [0], description: [''], imageUrl: [''],
    originalFee: [0, [Validators.required, Validators.min(0)]], institutionDiscountPct: [0, [Validators.min(0), Validators.max(100)]],
    admissionFee: [0, Validators.min(0)], additionalFees: [0, Validators.min(0)], offerNote: [''], offerExpiresAt: [''], feeStructure: this.rows,
  });
  calc = signal<any>(null); err = signal(''); busy = signal(false);

  async ngOnInit() {
    this.form.valueChanges.subscribe(() => this.recalc());
    if (this.id) {
      try {
        const c = await this.api.get('/partner/courses/' + this.id); const v: any = {};
        for (const k of Object.keys(this.form.controls)) if (k !== 'feeStructure') v[k] = c[k] ?? (typeof this.form.get(k)!.value === 'number' ? 0 : '');
        v.offerExpiresAt = c.offerExpiresAt ? String(c.offerExpiresAt).slice(0, 10) : '';
        this.form.patchValue(v); (c.feeStructure || []).forEach((f: any) => this.addRow(f.label, f.amount));
        this.clubPct = c.clubDiscountPct || 0; this.status = c.status;
      } catch (e) { this.err.set(errText(e)); }
    }
    this.recalc();
  }
  addRow(label = '', amount = 0) { this.rows.push(this.fb.nonNullable.group({ label: [label, Validators.required], amount: [amount, [Validators.required, Validators.min(0)]] }) as FormGroup); }
  recalc() {
    const v = this.form.getRawValue();
    this.calc.set(calcPrice({ originalFee: +v.originalFee || 0, institutionPct: +v.institutionDiscountPct || 0, clubPct: this.clubPct, admissionFee: +v.admissionFee || 0, additionalFees: +v.additionalFees || 0 }));
  }
  async photo(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return;
    try { this.form.patchValue({ imageUrl: (await this.api.upload(f)).url }); } catch (e) { this.err.set(errText(e)); }
  }
  async save(submit: boolean) {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.err.set('Please fix the highlighted fields.'); return; }
    this.busy.set(true); this.err.set('');
    const body: any = { ...this.form.getRawValue() };
    if (!body.offerExpiresAt) delete body.offerExpiresAt; if (!body.imageUrl) delete body.imageUrl;
    try {
      const saved = this.id ? await this.api.put('/partner/courses/' + this.id, body) : await this.api.post('/partner/courses', body);
      if (submit) await this.api.post(`/partner/courses/${saved._id}/submit`);
      this.router.navigate(['/partner/offerings']);
    } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
