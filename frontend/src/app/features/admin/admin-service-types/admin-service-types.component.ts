import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_TYPES, loadServiceTypes } from '../../../core/models/service-types';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-service-types', imports: [ReactiveFormsModule], templateUrl: './admin-service-types.component.html', styleUrl: './admin-service-types.component.scss' })
export class AdminServiceTypesComponent implements OnInit {
  private api = inject(ApiService); private fb = inject(FormBuilder);
  items = signal<any[]>([]); editing = signal(''); msg = signal(''); err = signal(''); busy = signal(false);
  form = this.fb.nonNullable.group({ label: ['', [Validators.required, Validators.minLength(2)]], icon: ['✨'], order: [0], active: [true] });
  ngOnInit() { this.load(); }
  async load() { try { this.items.set((await this.api.get('/admin/service-types')).items); } catch (e) { this.err.set(errText(e)); } }
  private async refreshSite() { await this.load(); await loadServiceTypes(this.api); }
  edit(t: any) { this.editing.set(t._id); this.form.patchValue({ label: t.label, icon: t.icon || '✨', order: t.order, active: t.active }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  reset() { this.editing.set(''); this.form.reset({ label: '', icon: '✨', order: this.items().length, active: true }); }
  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.err.set(''); this.msg.set('');
    try {
      const b = this.form.getRawValue();
      this.editing() ? await this.api.put('/admin/service-types/' + this.editing(), b) : await this.api.post('/admin/service-types', b);
      this.msg.set('Saved. It appears in Find Partner Institutes and in the academy registration form.'); this.reset(); await this.refreshSite();
    } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(false); }
  }
  async toggle(t: any) { try { await this.api.put('/admin/service-types/' + t._id, { active: !t.active }); await this.refreshSite(); } catch (e) { this.err.set(errText(e)); } }
  async remove(t: any) {
    if (!confirm(`Delete the category "${t.label}"?`)) return; this.err.set(''); this.msg.set('');
    try { await this.api.delete('/admin/service-types/' + t._id); this.msg.set('Deleted.'); await this.refreshSite(); } catch (e) { this.err.set(errText(e)); }
  }
  count = () => SERVICE_TYPES.length;
}
