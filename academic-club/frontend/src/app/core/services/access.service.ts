import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

// What the logged-in member must pay (free days left, membership / booking fee), decided by the admin's settings.
@Injectable({ providedIn: 'root' })
export class AccessService {
  private api = inject(ApiService);
  access = signal<any>(null);
  async load() { const a = await this.api.get('/member/access'); this.access.set(a); return a; }
}
