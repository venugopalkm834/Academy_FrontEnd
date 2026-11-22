import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { typeInfo } from '../../../core/models/service-types';

@Component({ selector: 'ac-ad-strip', imports: [RouterLink], templateUrl: './ad-strip.component.html', styleUrl: './ad-strip.component.scss' })
export class AdStripComponent implements OnInit {
  @Input() base = '/partners'; // where an ad links to: /partners (public) or /member/sponsors (member panel)
  private api = inject(ApiService);
  ads = signal<any[]>([]);
  icon = (t: string) => typeInfo(t).icon;
  async ngOnInit() { try { this.ads.set((await this.api.get('/public/ads')).ads); } catch { /* ads are optional */ } }
}
