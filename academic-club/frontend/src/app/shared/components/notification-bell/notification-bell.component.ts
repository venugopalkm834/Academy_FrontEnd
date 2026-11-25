import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';

@Component({ selector: 'ac-notification-bell', imports: [DatePipe], templateUrl: './notification-bell.component.html', styleUrl: './notification-bell.component.scss' })
export class NotificationBellComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  open = signal(false); items = signal<any[]>([]); unread = signal(0);
  private timer: any;
  ngOnInit() { this.load(); this.timer = setInterval(() => this.load(), 60000); }
  ngOnDestroy() { clearInterval(this.timer); }
  async load() { try { const r = await this.api.get('/notifications'); this.items.set(r.items); this.unread.set(r.unread); } catch { /* ignore */ } }
  async toggle() {
    if (this.open()) { this.close(); return; }
    this.open.set(true); await this.load();
    if (this.unread() > 0) { try { await this.api.put('/notifications/read-all'); } catch { /* ignore */ } }
  }
  close() { this.open.set(false); this.unread.set(0); this.items.update((l) => l.map((i) => ({ ...i, read: true }))); }
}
