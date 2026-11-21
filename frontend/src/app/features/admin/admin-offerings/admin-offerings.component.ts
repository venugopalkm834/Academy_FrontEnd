import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-offerings', imports: [CurrencyPipe], templateUrl: './admin-offerings.component.html', styleUrl: './admin-offerings.component.scss' })
export class AdminOfferingsComponent implements OnInit {
  private api = inject(ApiService);
  filters = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INACTIVE', ''];
  filter = signal('PENDING_APPROVAL'); items = signal<any[]>([]); error = signal(''); loading = signal(true);
  ngOnInit() { this.load(); }
  setFilter(f: string) { this.filter.set(f); this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.items.set((await this.api.get('/admin/courses', { status: this.filter() })).items); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async review(c: any, action: string, club?: string) {
    let reason: string | null = null;
    if (action === 'reject') { reason = prompt('Reason for rejection?'); if (reason === null) return; }
    try { await this.api.put(`/admin/courses/${c._id}/review`, { action, reason: reason || undefined, clubDiscountPct: action === 'approve' ? +(club || 0) : undefined }); await this.load(); }
    catch (e) { this.error.set(errText(e)); }
  }
}
