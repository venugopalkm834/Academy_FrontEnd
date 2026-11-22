import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

// Image ads added by the admin (Admin > Banners). Auto-rotates, swipe / arrows / dots, phone-specific image optional.
@Component({ selector: 'ac-banner-slider', imports: [RouterLink, NgTemplateOutlet], templateUrl: './banner-slider.component.html', styleUrl: './banner-slider.component.scss' })
export class BannerSliderComponent implements OnInit, OnDestroy {
  @Input() placement: 'HOME' | 'MEMBER' = 'HOME';
  private api = inject(ApiService);
  items = signal<any[]>([]); idx = signal(0);
  private timer: any; private paused = false; private x0 = 0;
  isInternal = (u: string) => !!u && u.startsWith('/');
  async ngOnInit() {
    try { this.items.set((await this.api.get('/public/banners', { placement: this.placement })).items); } catch { /* banners are optional */ }
    this.timer = setInterval(() => { if (!this.paused && this.items().length > 1) this.go(1); }, 5000);
  }
  ngOnDestroy() { clearInterval(this.timer); }
  go(n: number) { const len = this.items().length; this.idx.set((this.idx() + n + len) % len); }
  set(i: number) { this.idx.set(i); }
  pause(v: boolean) { this.paused = v; }
  start(e: TouchEvent) { this.x0 = e.touches[0].clientX; this.paused = true; }
  end(e: TouchEvent) { const dx = e.changedTouches[0].clientX - this.x0; if (Math.abs(dx) > 40 && this.items().length > 1) this.go(dx < 0 ? 1 : -1); this.paused = false; }
}
