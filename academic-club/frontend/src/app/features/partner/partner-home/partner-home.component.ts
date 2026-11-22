import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { StatCountersComponent } from '../../../shared/components/stat-counters/stat-counters.component';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-partner-home', imports: [RouterLink, StatCountersComponent], templateUrl: './partner-home.component.html', styleUrl: './partner-home.component.scss' })
export class PartnerHomeComponent implements OnInit {
  private api = inject(ApiService);
  d = signal<any>(null); error = signal('');
  async ngOnInit() { try { this.d.set(await this.api.get('/partner/dashboard')); } catch (e) { this.error.set(errText(e)); } }
}
