import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-email-templates', templateUrl: './admin-email-templates.component.html', styleUrl: './admin-email-templates.component.scss' })
export class AdminEmailTemplatesComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]); open = signal(''); msg = signal(''); err = signal(''); busy = signal('');
  ngOnInit() { this.load(); }
  async load() { try { this.items.set((await this.api.get('/admin/email-templates')).items); } catch (e) { this.err.set(errText(e)); } }
  toggle(k: string) { this.open.set(this.open() === k ? '' : k); this.msg.set(''); this.err.set(''); }
  private async run(key: string, fn: () => Promise<any>, ok?: string) {
    this.busy.set(key); this.err.set(''); this.msg.set('');
    try { const r = await fn(); this.msg.set(ok || r?.message || 'Done'); } catch (e) { this.err.set(errText(e)); } finally { this.busy.set(''); }
  }
  save(t: any) { return this.run(t.key, () => this.api.put('/admin/email-templates/' + t.key, { subject: t.subject, body: t.body, enabled: t.enabled }), 'Saved. This wording is used from now on.'); }
  async reset(t: any) { if (!confirm('Go back to the default wording?')) return; await this.run(t.key, () => this.api.delete('/admin/email-templates/' + t.key)); await this.load(); }
  test(t: any) { return this.run(t.key, () => this.api.post(`/admin/email-templates/${t.key}/test`)); }
}
