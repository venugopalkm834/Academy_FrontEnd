import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-members', imports: [DatePipe, CurrencyPipe], templateUrl: './admin-members.component.html', styleUrl: './admin-members.component.scss' })
export class AdminMembersComponent implements OnInit {
  private api = inject(ApiService);
  q = signal(''); memberType = signal(''); membership = signal(''); page = signal(1); pages = signal(1); total = signal(0);
  items = signal<any[]>([]); error = signal(''); loading = signal(true);
  open = signal<any>(null); photo = signal('');
  ngOnInit() { this.load(); }
  params() { return { q: this.q(), memberType: this.memberType(), membership: this.membership(), page: this.page(), limit: 12 }; }
  go() { this.page.set(1); this.load(); }
  turn(n: number) { this.page.set(this.page() + n); this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { const r = await this.api.get('/admin/members', this.params()); this.items.set(r.items); this.pages.set(r.pages); this.total.set(r.total); }
    catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async view(m: any) {
    if (this.open()?._id === m._id) { this.open.set(null); return; }
    this.photo.set('');
    try { this.open.set(await this.api.get('/admin/members/' + m._id)); if (m.hasPhoto) this.photo.set(URL.createObjectURL(await this.api.blob(`/admin/members/${m._id}/photo`))); } catch (e) { this.error.set(errText(e)); }
  }
  async setStatus(m: any, status: string) { try { await this.api.put(`/admin/members/${m._id}/status`, { status }); await this.load(); } catch (e) { this.error.set(errText(e)); } }
  async export() {
    const p = new URLSearchParams(); const x: any = this.params(); for (const k of ['q', 'memberType']) if (x[k]) p.set(k, x[k]);
    try { await this.api.download('/admin/members/export.csv?' + p.toString(), 'members.csv'); } catch (e) { this.error.set(errText(e)); }
  }
}
