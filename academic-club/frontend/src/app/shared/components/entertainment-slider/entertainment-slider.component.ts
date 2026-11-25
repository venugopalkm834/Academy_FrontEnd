import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

// "Club Entertainment" on the home page: every item the admin lists slides here. Hidden when there is nothing to show.
@Component({ selector: 'ac-entertainment-slider', imports: [RouterLink, CurrencyPipe, DatePipe], templateUrl: './entertainment-slider.component.html', styleUrl: './entertainment-slider.component.scss' })
export class EntertainmentSliderComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  @ViewChild('track') track?: ElementRef<HTMLElement>;
  items = signal<any[]>([]);
  private timer: any; private paused = false;
  async ngOnInit() {
    try { this.items.set((await this.api.get('/public/entertainment')).items); } catch { /* optional section */ }
    this.timer = setInterval(() => { if (!this.paused) this.move(1); }, 4500);
  }
  ngOnDestroy() { clearInterval(this.timer); }
  pause(v: boolean) { this.paused = v; }
  move(dir: number) {
    const el = this.track?.nativeElement; if (!el) return;
    const card = el.firstElementChild as HTMLElement | null, step = (card?.offsetWidth || 300) + 16, max = el.scrollWidth - el.clientWidth;
    if (dir > 0 && el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: max, behavior: 'smooth' });
    else el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
}
