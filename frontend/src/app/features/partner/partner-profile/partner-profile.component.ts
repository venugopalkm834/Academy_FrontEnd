import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-partner-profile', imports: [ReactiveFormsModule], templateUrl: './partner-profile.component.html', styleUrl: './partner-profile.component.scss' })
export class PartnerProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required], description: [''], services: [''], contactPerson: [''], contactPhone: [''], email: ['', Validators.email], website: [''],
    address: [''], city: [''], state: [''], district: [''], pin: [''], logoUrl: [''], coverUrl: [''],
  });
  approval = signal(''); hasDoc = signal(false); msg = signal(''); err = signal(''); busy = signal(false);

  async ngOnInit() {
    try {
      const r = await this.api.get('/partner/profile'); const i = r.institution, v: any = {};
      for (const k of Object.keys(this.form.controls)) v[k] = i[k] ?? '';
      v.services = (i.services || []).join(', ');
      this.form.patchValue(v); this.approval.set(r.approval); this.hasDoc.set(r.hasDocument);
    } catch (e) { this.err.set(errText(e)); }
  }
  async pickImage(ev: Event, field: 'logoUrl' | 'coverUrl') {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set('');
    try { this.form.patchValue({ [field]: (await this.api.upload(f)).url } as any); } catch (e) { this.err.set(errText(e)); }
  }
  async pickDoc(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set('');
    try { await this.api.upload(f, 'document'); this.hasDoc.set(true); this.msg.set('Registration document uploaded.'); } catch (e) { this.err.set(errText(e)); }
  }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const v: any = { ...this.form.getRawValue() };
    v.services = String(v.services).split(',').map((s: string) => s.trim()).filter(Boolean);
    if (!v.email) delete v.email;
    try { await this.api.put('/partner/profile', v); this.msg.set('Profile saved.'); } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
