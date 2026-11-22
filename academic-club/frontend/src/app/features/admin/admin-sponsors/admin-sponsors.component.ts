import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { typeInfo } from '../../../core/models/service-types';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-sponsors', imports: [ReactiveFormsModule, SlicePipe], templateUrl: './admin-sponsors.component.html', styleUrl: './admin-sponsors.component.scss' })
export class AdminSponsorsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  institutions = signal<any[]>([]); sponsors = signal<any[]>([]); err = signal(''); msg = signal(''); busy = signal(false);
  label = (t: string) => typeInfo(t).label;
  form = this.fb.nonNullable.group({ institutionId: ['', Validators.required], headline: ['', [Validators.required, Validators.minLength(2)]], adText: [''], imageUrl: [''], startsAt: [''], expiresAt: [''], order: [0], active: [true] });

  async ngOnInit() {
    try { this.institutions.set((await this.api.get('/admin/institutions')).items); await this.load(); } catch (e) { this.err.set(errText(e)); }
  }
  async load() { this.sponsors.set((await this.api.get('/admin/sponsors')).items); }
  async pickImage(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return;
    try { this.form.patchValue({ imageUrl: (await this.api.upload(f)).url }); } catch (e) { this.err.set(errText(e)); }
  }
  async add() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const b: any = { ...this.form.getRawValue() };
    for (const k of ['startsAt', 'expiresAt', 'imageUrl', 'adText']) if (!b[k]) delete b[k];
    try { await this.api.post('/admin/sponsors', b); this.msg.set('Sponsor added. It now shows in the user panel.'); this.form.reset({ order: 0, active: true }); await this.load(); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
  async toggle(s: any) { try { await this.api.put('/admin/sponsors/' + s._id, { active: !s.active }); await this.load(); } catch (e) { this.err.set(errText(e)); } }
  async remove(s: any) { if (!confirm('Remove this sponsor?')) return; try { await this.api.delete('/admin/sponsors/' + s._id); await this.load(); } catch (e) { this.err.set(errText(e)); } }
}
