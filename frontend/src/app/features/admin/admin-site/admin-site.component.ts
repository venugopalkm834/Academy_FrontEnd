import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ContactService } from '../../../core/services/contact.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-site', imports: [ReactiveFormsModule], templateUrl: './admin-site.component.html', styleUrl: './admin-site.component.scss' })
export class AdminSiteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private contact = inject(ContactService);
  msg = signal(''); err = signal(''); busy = signal(false); resend = signal(false);
  form = this.fb.nonNullable.group({
    contactEmail: ['', Validators.email], whatsapp: ['', Validators.pattern(/^[+\d\s-]{0,16}$/)], contactPhone: [''], address: [''], workingHours: [''], whatsappMessage: [''],
    emailFrom: [''], notifyEmail: ['', Validators.email],
  });
  async ngOnInit() {
    try { const s = await this.api.get('/admin/site'); this.resend.set(!!s.resendConfigured); const v: any = {}; for (const k of Object.keys(this.form.controls)) v[k] = s[k] ?? ''; this.form.patchValue(v); }
    catch (e) { this.err.set(errText(e)); }
  }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.err.set('Please fix the highlighted fields.'); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    try { await this.api.put('/admin/site', this.form.getRawValue()); this.msg.set('Saved. The new details show on the site, in member and academy panels and behind the WhatsApp button.'); await this.contact.load(true); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
