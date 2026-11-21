import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { shrinkImage } from '../../../core/utils/image';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-banners', imports: [ReactiveFormsModule, SlicePipe], templateUrl: './admin-banners.component.html', styleUrl: './admin-banners.component.scss' })
export class AdminBannersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  items = signal<any[]>([]); editing = signal(''); msg = signal(''); err = signal(''); busy = signal(false); uploading = signal(false);
  form = this.fb.nonNullable.group({
    title: [''], imageUrl: ['', Validators.required], mobileImageUrl: [''], linkUrl: ['', Validators.pattern(/^(https?:\/\/\S+|\/\S*)?$/)],
    placement: ['ALL'], startsAt: [''], expiresAt: [''], order: [0], active: [true],
  });
  ngOnInit() { this.load(); }
  async load() { try { this.items.set((await this.api.get('/admin/banners')).items); } catch (e) { this.err.set(errText(e)); } }
  async pick(ev: Event, field: 'imageUrl' | 'mobileImageUrl') {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; this.err.set(''); this.uploading.set(true);
    try { const blob = await shrinkImage(f, field === 'imageUrl' ? 1600 : 900); this.form.patchValue({ [field]: (await this.api.upload(new File([blob], 'banner.jpg', { type: 'image/jpeg' }))).url } as any); }
    catch (e) { this.err.set(errText(e)); } finally { this.uploading.set(false); }
  }
  edit(b: any) {
    this.editing.set(b._id);
    this.form.patchValue({ title: b.title || '', imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl || '', linkUrl: b.linkUrl || '', placement: b.placement, startsAt: b.startsAt ? String(b.startsAt).slice(0, 10) : '', expiresAt: b.expiresAt ? String(b.expiresAt).slice(0, 10) : '', order: b.order, active: b.active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  reset() { this.editing.set(''); this.form.reset({ title: '', imageUrl: '', mobileImageUrl: '', linkUrl: '', placement: 'ALL', startsAt: '', expiresAt: '', order: 0, active: true }); }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.err.set(this.form.controls.imageUrl.invalid ? 'Please upload the banner image.' : 'Please fix the highlighted fields.'); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const b: any = { ...this.form.getRawValue() }; for (const k of ['title', 'mobileImageUrl', 'linkUrl', 'startsAt', 'expiresAt']) if (!b[k]) delete b[k];
    try { this.editing() ? await this.api.put('/admin/banners/' + this.editing(), b) : await this.api.post('/admin/banners', b); this.msg.set('Banner saved. It shows on the site right away.'); this.reset(); await this.load(); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
  async toggle(b: any) { try { await this.api.put('/admin/banners/' + b._id, { active: !b.active }); await this.load(); } catch (e) { this.err.set(errText(e)); } }
  async remove(b: any) { if (!confirm('Delete this banner?')) return; try { await this.api.delete('/admin/banners/' + b._id); await this.load(); } catch (e) { this.err.set(errText(e)); } }
}
