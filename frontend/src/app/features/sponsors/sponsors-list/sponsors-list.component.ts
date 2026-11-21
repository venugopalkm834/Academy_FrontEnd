import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_TYPES, typeInfo } from '../../../core/models/service-types';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-sponsors-list', imports: [RouterLink, CurrencyPipe], templateUrl: './sponsors-list.component.html', styleUrl: './sponsors-list.component.scss' })
export class SponsorsListComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  types = SERVICE_TYPES;
  icon = (t: string) => typeInfo(t).icon;
  label = (t: string) => typeInfo(t).label;
  q = signal(''); type = signal(''); pin = signal(''); state = signal(''); district = signal(''); city = signal(''); page = signal(1);
  loc = signal<{ states: string[]; districts: string[]; cities: string[] }>({ states: [], districts: [], cities: [] });
  items = signal<any[]>([]); pages = signal(1); total = signal(0); loading = signal(true); error = signal('');

  ngOnInit() {
    const p = this.route.snapshot.queryParamMap;
    this.q.set(p.get('q') || ''); this.type.set(p.get('type') || '');
    this.loadLocations(); this.search();
  }
  async loadLocations() { try { this.loc.set(await this.api.get('/public/locations', { state: this.state(), district: this.district() })); } catch { /* filters just stay empty */ } }
  setType(t: string) { this.type.set(t); this.go(); }
  async onState(v: string) { this.state.set(v); this.district.set(''); this.city.set(''); await this.loadLocations(); this.go(); }
  async onDistrict(v: string) { this.district.set(v); this.city.set(''); await this.loadLocations(); this.go(); }
  onCity(v: string) { this.city.set(v); this.go(); }
  clear() { this.q.set(''); this.type.set(''); this.pin.set(''); this.state.set(''); this.district.set(''); this.city.set(''); this.loadLocations(); this.go(); }
  go() { this.page.set(1); this.search(); }
  turn(n: number) { this.page.set(this.page() + n); this.search(); }
  async search() {
    this.loading.set(true); this.error.set('');
    try {
      const r = await this.api.get('/public/services', { q: this.q(), type: this.type(), pin: this.pin(), state: this.state(), district: this.district(), city: this.city(), page: this.page() });
      this.items.set(r.items); this.pages.set(r.pages); this.total.set(r.total);
    } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
}
