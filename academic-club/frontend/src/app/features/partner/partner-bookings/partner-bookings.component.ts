import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-partner-bookings', imports: [CurrencyPipe, DatePipe], templateUrl: './partner-bookings.component.html', styleUrl: './partner-bookings.component.scss' })
export class PartnerBookingsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]); loading = signal(true); error = signal('');
  async ngOnInit() {
    try { this.items.set((await this.api.get('/partner/bookings')).items); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
}
