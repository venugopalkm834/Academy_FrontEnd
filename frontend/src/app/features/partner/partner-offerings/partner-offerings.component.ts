import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

const LABEL: Record<string, string> = { DRAFT: 'Draft', PENDING_APPROVAL: 'Awaiting approval', APPROVED: 'Live', REJECTED: 'Rejected', INACTIVE: 'Inactive' };

@Component({ selector: 'ac-partner-offerings', imports: [RouterLink, CurrencyPipe], templateUrl: './partner-offerings.component.html', styleUrl: './partner-offerings.component.scss' })
export class PartnerOfferingsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]); loading = signal(true); error = signal('');
  label = (s: string) => LABEL[s] || s;
  ngOnInit() { this.load(); }
  async load() {
    this.loading.set(true);
    try { this.items.set((await this.api.get('/partner/courses')).items); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async submit(c: any) { this.error.set(''); try { await this.api.post(`/partner/courses/${c._id}/submit`); await this.load(); } catch (e) { this.error.set(errText(e)); } }
  async remove(c: any) { if (!confirm(`Delete "${c.name}"?`)) return; try { await this.api.delete(`/partner/courses/${c._id}`); await this.load(); } catch (e) { this.error.set(errText(e)); } }
}
