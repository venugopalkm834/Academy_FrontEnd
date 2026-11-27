import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_TYPES, typeInfo } from '../../../core/models/service-types';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-partners', templateUrl: './admin-partners.component.html', styleUrl: './admin-partners.component.scss' })
export class AdminPartnersComponent implements OnInit {
  private api = inject(ApiService);
  filters = ['', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
  filter = signal('PENDING'); items = signal<any[]>([]); error = signal(''); loading = signal(true);
  label = (t: string) => typeInfo(t).label; types = SERVICE_TYPES;
  editId = signal(''); draft: any = {}; msg = signal('');
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
  startEdit(p: any) { const i = p.institution || {}; this.editId.set(p.id); this.msg.set(''); this.draft = { name: i.name || '', type: i.type || 'OTHER', address: i.address || '', city: i.city || '', district: i.district || '', state: i.state || '', pin: i.pin || '', contactPhone: i.contactPhone || '' }; }
  async saveEdit(p: any) {
    this.error.set('');
    try { await this.api.put(`/admin/partners/${p.id}/institution`, this.draft); this.editId.set(''); this.msg.set('Details saved.'); await this.load(); } catch (e) { this.error.set(errText(e)); }
  }
  async remove(p: any) {
    if (!confirm(`Delete "${p.institution?.name || p.contactName}" permanently?\n\nThe academy, its offerings and ads are removed from the website and the login stops working. This cannot be undone.`)) return;
    this.error.set(''); this.msg.set('');
    try { await this.api.delete(`/admin/partners/${p.id}`); this.msg.set('Partner deleted.'); await this.load(); } catch (e) { this.error.set(errText(e)); }
  }
  async doc(p: any) {
    try { window.open(URL.createObjectURL(await this.api.blob(`/admin/partners/${p.id}/document`)), '_blank'); } catch (e) { this.error.set(errText(e)); }
  }
}
