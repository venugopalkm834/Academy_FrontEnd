import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { EDU_LEVELS, INDIA_STATES } from '../../../core/models/education';
import { shrinkImage } from '../../../core/utils/image';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-member-profile', imports: [ReactiveFormsModule], templateUrl: './member-profile.component.html', styleUrl: './member-profile.component.scss' })
export class MemberProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  levels = EDU_LEVELS; states = INDIA_STATES; today = new Date().toISOString().slice(0, 10);
  info = signal<any>(null); photo = signal(''); msg = signal(''); err = signal(''); busy = signal(false); private photoKey = '';
  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]], memberType: ['STUDENT'], gender: ['', Validators.required], dob: ['', Validators.required],
    address: ['', [Validators.required, Validators.minLength(5)]], state: ['', Validators.required], district: ['', Validators.required], city: ['', Validators.required],
    pin: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]], educationLevel: ['', Validators.required], school: [''],
  });
  bad(n: string) { const c = this.form.get(n); return !!c && c.invalid && c.touched; }
  async ngOnInit() {
    try {
      const p = await this.api.get('/member/profile'); this.info.set(p); const v: any = {};
      for (const k of Object.keys(this.form.controls)) v[k] = p[k] ?? '';
      v.dob = p.dob ? String(p.dob).slice(0, 10) : ''; this.form.patchValue(v);
      if (p.hasPhoto) this.photo.set(URL.createObjectURL(await this.api.blob('/member/photo')));
    } catch (e) { this.err.set(errText(e)); }
  }
  async onPhoto(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set('');
    try { const b = await shrinkImage(f); this.photo.set(URL.createObjectURL(b)); this.photoKey = (await this.api.selfie(b)).key; } catch (e) { this.err.set(errText(e)); }
  }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const body: any = { ...this.form.getRawValue() }; if (!body.school) delete body.school; if (this.photoKey) body.photoKey = this.photoKey;
    try { await this.api.put('/member/profile', body); this.msg.set('Profile updated.'); this.photoKey = ''; } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
