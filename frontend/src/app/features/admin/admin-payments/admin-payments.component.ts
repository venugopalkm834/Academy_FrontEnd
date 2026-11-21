import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { APPROVED: 'Successful', CREATED: 'Pending', UNDER_REVIEW: 'Verify', REJECTED: 'Rejected', FAILED: 'Failed', REFUNDED: 'Refunded' };

@Component({ selector: 'ac-admin-payments', imports: [CurrencyPipe, DatePipe], templateUrl: './admin-payments.component.html', styleUrl: './admin-payments.component.scss' })
export class AdminPaymentsComponent implements OnInit {
  private api = inject(ApiService);
  statuses = [['UNDER_REVIEW', 'To verify'], ['APPROVED', 'Successful'], ['CREATED', 'Pending'], ['FAILED', 'Failed'], ['REJECTED', 'Rejected'], ['REFUNDED', 'Refunded'], ['', 'All']];
  purposes = [['', 'All types'], ['MEMBERSHIP', 'Membership'], ['BOOKING', 'Booking'], ['LISTING', 'Partner listing'], ['SPONSORSHIP', 'Sponsorship']];
  status = signal('UNDER_REVIEW'); purpose = signal(''); page = signal(1); pages = signal(1); total = signal(0);
  items = signal<any[]>([]); error = signal(''); loading = signal(true);
  label = (s: string) => LABEL[s] || s;
  ngOnInit() { this.load(); }
  setStatus(s: string) { this.status.set(s); this.page.set(1); this.load(); }
  setPurpose(p: string) { this.purpose.set(p); this.page.set(1); this.load(); }
  turn(n: number) { this.page.set(this.page() + n); this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { const r = await this.api.get('/admin/payments', { status: this.status(), purpose: this.purpose(), page: this.page(), limit: 12 }); this.items.set(r.items); this.pages.set(r.pages); this.total.set(r.total); }
    catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async export() {
    const p = new URLSearchParams(); if (this.status()) p.set('status', this.status()); if (this.purpose()) p.set('purpose', this.purpose());
    try { await this.api.download('/admin/payments/export.csv?' + p.toString(), 'payments.csv'); } catch (e) { this.error.set(errText(e)); }
  }
  async proof(p: any) { try { window.open(URL.createObjectURL(await this.api.blob(`/admin/payments/${p._id}/proof`)), '_blank'); } catch (e) { this.error.set(errText(e)); } }
  async review(p: any, action: string) {
    let reason: string | null = null;
    if (action === 'reject') { reason = prompt('Reason for rejection?'); if (reason === null) return; }
    else if (!confirm(`Approve ${p.amount} paid by ${p.user?.firstName}? Check the screenshot against your bank / UPI statement first.`)) return;
    try { await this.api.put(`/admin/payments/${p._id}/review`, { action, reason: reason || undefined }); await this.load(); } catch (e) { this.error.set(errText(e)); }
  }
}
