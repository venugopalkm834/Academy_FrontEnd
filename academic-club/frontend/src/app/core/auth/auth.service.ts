import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API } from '../config/api.config';
import { Role, SessionUser } from '../models/user.model';
import { loginFor } from './auth.helpers';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  token = signal<string | null>(null); // memory only, never localStorage
  user = signal<SessionUser | null>(null);

  async login(role: Role, mobile: string, password: string) {
    const r = await firstValueFrom(this.http.post<{ accessToken: string; user: SessionUser }>(`${API}/auth/login`, { mobile, password, role }, { withCredentials: true }));
    this.token.set(r.accessToken); this.user.set(r.user); return r.user;
  }
  async refresh(): Promise<boolean> {
    try {
      const r = await firstValueFrom(this.http.post<{ accessToken: string }>(`${API}/auth/refresh`, {}, { withCredentials: true }));
      this.token.set(r.accessToken);
      if (!this.user()) {
        const { user: u } = await firstValueFrom(this.http.get<{ user: any }>(`${API}/auth/me`));
        this.user.set({ id: u._id, role: u.role, email: u.email, firstName: u.firstName, status: u.status, emailVerified: u.emailVerified });
      }
      return true;
    } catch { this.token.set(null); this.user.set(null); return false; }
  }
  async logout() {
    const role = this.user()?.role ?? 'MEMBER';
    try { await firstValueFrom(this.http.post(`${API}/auth/logout`, {}, { withCredentials: true })); } catch {}
    this.token.set(null); this.user.set(null); this.router.navigateByUrl(loginFor(role));
  }
}
