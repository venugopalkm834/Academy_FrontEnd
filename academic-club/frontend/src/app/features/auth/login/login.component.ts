import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { homeFor } from '../../../core/auth/auth.helpers';
import { Role } from '../../../core/models/user.model';
import { errText } from '../../../core/utils/error.util';

@Component({
  selector: 'ac-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder); private auth = inject(AuthService); private router = inject(Router);
  private route = inject(ActivatedRoute);
  role = this.route.snapshot.data['role'] as Role;
  f = this.fb.nonNullable.group({ mobile: ['', [Validators.required, Validators.pattern(/^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/)]], password: ['', Validators.required] });
  registered = inject(ActivatedRoute).snapshot.queryParamMap.has('registered');
  err = signal(''); busy = signal(false);
  invalid(n: 'mobile' | 'password') { const c = this.f.controls[n]; return c.invalid && (c.touched || c.dirty); }
  async go() {
    if (this.f.invalid) { this.f.markAllAsTouched(); return; }
    this.busy.set(true); this.err.set('');
    try { const u = await this.auth.login(this.role, this.f.value.mobile!, this.f.value.password!); const ru = this.route.snapshot.queryParamMap.get('returnUrl'); // go back to the page the user wanted (same panel only)
      this.router.navigateByUrl(ru && ru.startsWith(homeFor(u.role)) ? ru : homeFor(u.role)); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
}
