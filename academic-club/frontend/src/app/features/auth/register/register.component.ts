import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../../../core/config/api.config';
import { errText } from '../../../core/utils/error.util';
import { strong } from '../../../core/validators/password.validator';
import { CFG } from './register.config';

@Component({
  selector: 'ac-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private http = inject(HttpClient);
  kind = inject(ActivatedRoute).snapshot.data['kind'] as 'member' | 'partner';
  cfg = CFG[this.kind];
  err = signal(''); busy = signal(false); ok = signal(false);
  form = (() => {
    const fb = inject(FormBuilder), g: Record<string, any> = {};
    for (const f of this.cfg.fields) {
      const v: ValidatorFn[] = f.optional ? [] : [Validators.required];
      if (f.type === 'email') v.push(Validators.email); if (f.pattern) v.push(Validators.pattern(f.pattern)); if (f.name === 'password') v.push(strong);
      g[f.name] = ['', v];
    }
    if (this.cfg.checks) { g['acceptTerms'] = [false, Validators.requiredTrue]; g['acceptPrivacy'] = [false, Validators.requiredTrue]; }
    return fb.group(g, { validators: (c: AbstractControl): ValidationErrors | null => (c.get('password')?.value === c.get('confirmPassword')?.value ? null : { mismatch: true }) });
  })();
  bad(n: string) { const c = this.form.get(n); return !!c && c.invalid && c.touched; }
  async submit() {
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    const body = Object.fromEntries(Object.entries(this.form.getRawValue()).filter(([, v]) => v !== '')); // drop empty optionals
    this.busy.set(true); this.err.set('');
    try { await firstValueFrom(this.http.post(`${API}/auth/${this.kind}/register`, body)); this.ok.set(true); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
