import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../../../core/config/api.config';
import { errText } from '../../../core/utils/error.util';
import { strong } from '../../../core/validators/password.validator';

@Component({
  selector: 'ac-account-links',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account-links.component.html',
  styleUrl: './account-links.component.scss',
})
export class AccountLinksComponent {
  private http = inject(HttpClient); private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  mode = this.route.snapshot.data['mode'] as 'forgot' | 'reset' | 'verify';
  token = this.route.snapshot.queryParamMap.get('token') || '';
  f = this.fb.nonNullable.group({ mobile: [''], password: [''] });
  msg = signal(''); err = signal(''); busy = signal(false);
  constructor() {
    if (this.mode === 'forgot') this.f.controls.mobile.setValidators([Validators.required, Validators.pattern(/^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/)]);
    if (this.mode === 'reset') this.f.controls.password.setValidators([Validators.required, strong]);
    if (this.mode === 'verify') this.go();
  }
  async go() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const call = this.mode === 'forgot' ? this.http.post<{ message: string }>(`${API}/auth/forgot-password`, { mobile: this.f.value.mobile })
      : this.mode === 'reset' ? this.http.post<{ message: string }>(`${API}/auth/reset-password`, { token: this.token, password: this.f.value.password })
      : this.http.post<{ message: string }>(`${API}/auth/verify-email`, { token: this.token });
    try { this.msg.set((await firstValueFrom(call)).message); } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
