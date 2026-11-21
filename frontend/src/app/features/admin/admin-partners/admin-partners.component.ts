import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { typeInfo } from '../../../core/models/service-types';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-partners', templateUrl: './admin-partners.component.html', styleUrl: './admin-partners.component.scss' })
export class AdminPartnersComponent implements OnInit {
  private api = inject(ApiService);
  filters = ['', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
  filter = signal('PENDING'); items = signal<any[]>([]); error = signal(''); loading = signal(true);
  label = (t: string) => typeInfo(t).label;
  ngOnInit() { this.load(); }
  setFilter(f: string) { this.filter.set(f); this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.items.set((await this.api.get('/admin/partners', { status: this.filter() })).items); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async act(p: any, action: string) {
    let reason: string | null = null;
    if (action === 'reject') { reason = prompt('Reason for rejection?'); if (reason === null) return; }
    try { await this.api.put(`/admin/partners/${p.id}/status`, { action, reason: reason || undefined }); await this.load(); } catch (e) { this.error.set(errText(e)); }
  }
  async doc(p: any) {
    try { window.open(URL.createObjectURL(await this.api.blob(`/admin/partners/${p.id}/document`)), '_blank'); } catch (e) { this.error.set(errText(e)); }
  }
}
