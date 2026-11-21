import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { EDU_LEVELS, INDIA_STATES, groupLabel, groupOf } from '../../../core/models/education';
import { aadhaarValidator } from '../../../core/utils/aadhaar';
import { shrinkImage } from '../../../core/utils/image';
import { strong } from '../../../core/validators/password.validator';
import { errText } from '../../../core/utils/error.util';

const same = (c: AbstractControl): ValidationErrors | null => (c.get('password')?.value === c.get('confirmPassword')?.value ? null : { mismatch: true });

@Component({ selector: 'ac-member-register', imports: [ReactiveFormsModule, RouterLink], templateUrl: './member-register.component.html', styleUrl: './member-register.component.scss' })
export class MemberRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  levels = EDU_LEVELS; states = INDIA_STATES; today = new Date().toISOString().slice(0, 10);
  requireAadhaar = signal(true); err = signal(''); busy = signal(false); photoBusy = signal(false); photoPreview = signal(''); photoKey = '';
  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]], memberType: ['STUDENT', Validators.required], phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]], dob: ['', Validators.required], gender: ['', Validators.required],
    address: ['', [Validators.required, Validators.minLength(5)]], state: ['', Validators.required], district: ['', [Validators.required, Validators.minLength(2)]], city: ['', [Validators.required, Validators.minLength(2)]],
    pin: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]], educationLevel: ['', Validators.required], school: [''],
    aadhaar: ['', [aadhaarValidator]], aadhaarConsent: [false],
    password: ['', [Validators.required, strong]], confirmPassword: ['', Validators.required], acceptTerms: [false, Validators.requiredTrue], acceptPrivacy: [false, Validators.requiredTrue],
  }, { validators: same });

  async ngOnInit() {
    try { this.requireAadhaar.set((await this.api.get('/public/config')).requireAadhaar); } catch { /* default: required */ }
    if (this.requireAadhaar()) this.form.controls.aadhaar.addValidators(Validators.required);
    this.form.controls.aadhaar.updateValueAndValidity();
  }
  planGroup() { return groupLabel(groupOf(this.form.value.educationLevel || '')); }
  bad(n: string) { const c = this.form.get(n); return !!c && c.invalid && (c.touched || c.dirty); }
  async onPhoto(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return;
    this.photoBusy.set(true); this.err.set('');
    try { const blob = await shrinkImage(f); this.photoPreview.set(URL.createObjectURL(blob)); this.photoKey = (await this.api.selfie(blob)).key; }
    catch (e) { this.photoKey = ''; this.photoPreview.set(''); this.err.set(errText(e)); } finally { this.photoBusy.set(false); }
  }
  async submit() {
    this.form.markAllAsTouched();
    if (!this.photoKey) { this.err.set('Please add your selfie / photo.'); return; }
    if (this.form.invalid) { this.err.set('Please fix the highlighted fields.'); return; }
    const v: any = { ...this.form.getRawValue(), photoKey: this.photoKey };
    if (v.aadhaar) { v.aadhaar = String(v.aadhaar).replace(/\s/g, ''); if (!v.aadhaarConsent) { this.err.set('Please tick the Aadhaar consent box.'); return; } } else { delete v.aadhaar; delete v.aadhaarConsent; }
    if (!v.school) delete v.school;
    this.busy.set(true); this.err.set('');
    try { await this.api.post('/auth/member/register', v); this.router.navigate(['/login'], { queryParams: { registered: 1 } }); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
