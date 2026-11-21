import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { PENDING_PAYMENT: 'Awaiting payment', PAYMENT_REVIEW: 'Verify payment', PENDING_APPROVAL: 'Approve', ACTIVE: 'Live', REJECTED: 'Rejected', CANCELLED: 'Cancelled' };

@Component({ selector: 'ac-admin-sponsor-requests', imports: [CurrencyPipe, DatePipe], templateUrl: './admin-sponsor-requests.component.html', styleUrl: './admin-sponsor-requests.component.scss' })
export class AdminSponsorRequestsComponent implements OnInit {
  private api = inject(ApiService);
  filters = [['REVIEW', 'To review'], ['ACTIVE', 'Live'], ['PENDING_PAYMENT', 'Unpaid'], ['REJECTED', 'Rejected'], ['', 'All']];
  filter = signal('REVIEW'); all = signal<any[]>([]); error = signal(''); loading = signal(true);
  label = (s: string) => LABEL[s] || s;
  items() { const f = this.filter(); return this.all().filter((r) => (f === 'REVIEW' ? r.status === 'PAYMENT_REVIEW' || r.status === 'PENDING_APPROVAL' : !f || r.status === f)); }
  ngOnInit() { this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.all.set((await this.api.get('/admin/sponsor-requests')).items); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async proof(r: any) { try { window.open(URL.createObjectURL(await this.api.blob(`/admin/payments/${r.payment.id}/proof`)), '_blank'); } catch (e) { this.error.set(errText(e)); } }
  async review(r: any, action: string) {
    let reason: string | null = null;
    if (action === 'reject') { reason = prompt('Reason for rejection?'); if (reason === null) return; }
    else if (r.payment && !confirm('Approve and publish this sponsor? Check the payment screenshot against your bank / UPI statement first.')) return;
    try { await this.api.put(`/admin/sponsor-requests/${r._id}/review`, { action, reason: reason || undefined }); await this.load(); } catch (e) { this.error.set(errText(e)); }
  }
}
