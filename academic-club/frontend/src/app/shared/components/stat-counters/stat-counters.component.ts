import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

// Trust counters from the database (admin can override the display numbers in Payment Settings)
@Component({ selector: 'ac-stat-counters', templateUrl: './stat-counters.component.html', styleUrl: './stat-counters.component.scss' })
export class StatCountersComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  members = signal(0); institutes = signal(0); plusM = signal(false); plusI = signal(false); ready = signal(false);
  private raf = 0;
  fmt = (n: number) => n.toLocaleString('en-IN');
  private num = (l: string) => parseInt(String(l).replace(/[^\d]/g, ''), 10) || 0;
  async ngOnInit() {
    try {
      const s = await this.api.get('/public/stats'); const m = this.num(s.membersLabel), i = this.num(s.institutesLabel);
      this.plusM.set(String(s.membersLabel).endsWith('+')); this.plusI.set(String(s.institutesLabel).endsWith('+')); this.ready.set(true);
      const t0 = performance.now(), dur = 1400;
      const tick = (t: number) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); this.members.set(Math.round(m * e)); this.institutes.set(Math.round(i * e)); if (k < 1) this.raf = requestAnimationFrame(tick); };
      this.raf = requestAnimationFrame(tick);
    } catch { /* counters are optional */ }
  }
  ngOnDestroy() { cancelAnimationFrame(this.raf); }
}
