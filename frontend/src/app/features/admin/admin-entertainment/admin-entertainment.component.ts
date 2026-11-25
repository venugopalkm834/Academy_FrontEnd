import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { shrinkImage } from '../../../core/utils/image';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { PENDING_PAYMENT: 'Awaiting payment', PAYMENT_REVIEW: 'Verify payment', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled' };

@Component({ selector: 'ac-admin-entertainment', imports: [ReactiveFormsModule, CurrencyPipe, DatePipe], templateUrl: './admin-entertainment.component.html', styleUrl: './admin-entertainment.component.scss' })
export class AdminEntertainmentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  tab = signal<'list' | 'bookings'>('list'); items = signal<any[]>([]); bookings = signal<any[]>([]); filter = signal('PAYMENT_REVIEW');
  editing = signal(''); msg = signal(''); err = signal(''); busy = signal(false); uploading = signal(false);
  statuses = [['PAYMENT_REVIEW', 'To verify'], ['CONFIRMED', 'Confirmed'], ['PENDING_PAYMENT', 'Unpaid'], ['CANCELLED', 'Cancelled'], ['', 'All']];
  label = (s: string) => LABEL[s] || s;
  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]], subtitle: [''], description: [''], imageUrl: [''], venue: [''], eventDate: [''], eventTime: [''],
    price: [0, [Validators.required, Validators.min(0)]], capacity: [0, Validators.min(0)], maxPerBooking: [10, [Validators.required, Validators.min(1)]],
    startsAt: [''], expiresAt: [''], order: [0], active: [true],
  });
  ngOnInit() { this.load(); this.loadBookings(); }
  async load() { try { this.items.set((await this.api.get('/admin/entertainment')).items); } catch (e) { this.err.set(errText(e)); } }
  async loadBookings() { try { this.bookings.set((await this.api.get('/admin/entertainment-bookings', { status: this.filter() })).items); } catch (e) { this.err.set(errText(e)); } }
  setFilter(f: string) { this.filter.set(f); this.loadBookings(); }
  async pick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set(''); this.uploading.set(true);
    try { const blob = await shrinkImage(f, 1200); this.form.patchValue({ imageUrl: (await this.api.upload(new File([blob], 'event.jpg', { type: 'image/jpeg' }))).url }); } catch (e) { this.err.set(errText(e)); } finally { this.uploading.set(false); }
  }
  edit(e: any) {
    this.editing.set(e._id); this.tab.set('list');
    this.form.patchValue({ title: e.title, subtitle: e.subtitle || '', description: e.description || '', imageUrl: e.imageUrl || '', venue: e.venue || '', eventDate: e.eventDate ? String(e.eventDate).slice(0, 10) : '', eventTime: e.eventTime || '',
      price: e.price, capacity: e.capacity, maxPerBooking: e.maxPerBooking, startsAt: e.startsAt ? String(e.startsAt).slice(0, 10) : '', expiresAt: e.expiresAt ? String(e.expiresAt).slice(0, 10) : '', order: e.order, active: e.active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  reset() { this.editing.set(''); this.form.reset({ title: '', subtitle: '', description: '', imageUrl: '', venue: '', eventDate: '', eventTime: '', price: 0, capacity: 0, maxPerBooking: 10, startsAt: '', expiresAt: '', order: 0, active: true }); }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.err.set('Please fix the highlighted fields.'); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const b: any = { ...this.form.getRawValue() }; for (const k of ['subtitle', 'description', 'imageUrl', 'venue', 'eventDate', 'eventTime', 'startsAt', 'expiresAt']) if (!b[k]) delete b[k];
    try { this.editing() ? await this.api.put('/admin/entertainment/' + this.editing(), b) : await this.api.post('/admin/entertainment', b); this.msg.set('Saved. It shows in the Club Entertainment slider now.'); this.reset(); await this.load(); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
  async toggle(e: any) { try { await this.api.put('/admin/entertainment/' + e._id, { active: !e.active }); await this.load(); } catch (x) { this.err.set(errText(x)); } }
  async remove(e: any) { if (!confirm(`Remove "${e.title}"? Existing bookings are kept.`)) return; try { await this.api.delete('/admin/entertainment/' + e._id); await this.load(); } catch (x) { this.err.set(errText(x)); } }
  async proof(b: any) { try { window.open(URL.createObjectURL(await this.api.blob(`/admin/payments/${b.payment.id}/proof`)), '_blank'); } catch (e) { this.err.set(errText(e)); } }
  async review(b: any, action: string) {
    let reason: string | null = null;
    if (action === 'reject') { reason = prompt('Reason for rejection?'); if (reason === null) return; }
    else if (!confirm('Approve this payment and confirm the booking? Check the screenshot against your bank / UPI statement first.')) return;
    try { await this.api.put(`/admin/payments/${b.payment.id}/review`, { action, reason: reason || undefined }); await this.loadBookings(); await this.load(); } catch (e) { this.err.set(errText(e)); }
  }
}
