import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

// Contact details the admin entered (email, WhatsApp, address). Loaded once and shared by the site, member and academy panels.
@Injectable({ providedIn: 'root' })
export class ContactService {
  private api = inject(ApiService);
  info = signal<any>(null);
  private loading = false;
  async load(force = false) {
    if ((this.info() && !force) || this.loading) return;
    this.loading = true;
    try { this.info.set(await this.api.get('/public/contact')); } catch { /* optional */ } finally { this.loading = false; }
  }
}
