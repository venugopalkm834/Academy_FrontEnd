import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-plans', imports: [ReactiveFormsModule, CurrencyPipe], templateUrl: './admin-plans.component.html', styleUrl: './admin-plans.component.scss' })
export class AdminPlansComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  items = signal<any[]>([]); editing = signal<string>(''); msg = signal(''); err = signal(''); busy = signal(false);
  groupName = (g: string) => (g === 'LKG_SSLC' ? 'LKG to SSLC' : g === 'PUC_DEGREE' ? 'PUC to Degree' : 'All members');
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]], kind: ['YEARLY'], price: [0, [Validators.required, Validators.min(0)]], validityDays: [365, [Validators.required, Validators.min(1)]],
    educationGroup: ['ANY'], description: [''], benefits: [''], active: [true], order: [0],
  });
  ngOnInit() { this.load(); }
  async load() { try { this.items.set((await this.api.get('/admin/plans')).items); } catch (e) { this.err.set(errText(e)); } }
  edit(p: any) { this.editing.set(p._id); this.form.patchValue({ ...p, benefits: (p.benefits || []).join(', '), description: p.description || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  reset() { this.editing.set(''); this.form.reset({ name: '', kind: 'YEARLY', price: 0, validityDays: 365, educationGroup: 'ANY', description: '', benefits: '', active: true, order: 0 }); }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const b: any = { ...this.form.getRawValue() }; b.benefits = String(b.benefits).split(',').map((s: string) => s.trim()).filter(Boolean); if (!b.description) delete b.description;
    try { this.editing() ? await this.api.put('/admin/plans/' + this.editing(), b) : await this.api.post('/admin/plans', b); this.msg.set('Plan saved. Members see it immediately.'); this.reset(); await this.load(); }
    catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
  async toggle(p: any) { try { await this.api.put('/admin/plans/' + p._id, { active: !p.active }); await this.load(); } catch (e) { this.err.set(errText(e)); } }
  async remove(p: any) { if (!confirm(`Delete "${p.name}"?`)) return; try { this.msg.set((await this.api.delete('/admin/plans/' + p._id)).message); await this.load(); } catch (e) { this.err.set(errText(e)); } }
}
