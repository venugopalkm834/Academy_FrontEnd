import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { homeFor } from '../../core/auth/auth.helpers';
import { typeInfo } from '../../core/models/service-types';
import { BannerSliderComponent } from '../../shared/components/banner-slider/banner-slider.component';
import { StatCountersComponent } from '../../shared/components/stat-counters/stat-counters.component';

@Component({ selector: 'ac-home', imports: [RouterLink, StatCountersComponent, BannerSliderComponent], templateUrl: './home.component.html', styleUrl: './home.component.scss' })
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  home = homeFor;
  isPartner = () => this.auth.user()?.role === 'PARTNER'; // partners do not see the member-facing services pages
  img = true; // hides the optional hero photo if public/hero.jpg is missing
  ads = signal<any[]>([]); // sponsors chosen by the admin
  icon = (t: string) => typeInfo(t).icon;
  offers = [
    { name: 'Education Courses', type: 'COLLEGE', ico: '🎓', c1: '#1e63d6', c2: '#0b3a8a', cta: 'View Courses' },
    { name: 'Skill Development', type: 'TRAINING', ico: '💻', c1: '#2e9e44', c2: '#17692a', cta: 'Explore Skills' },
    { name: 'Sports & Fitness', type: 'SPORTS', ico: '⚽', c1: '#ff9a1f', c2: '#e8610c', cta: 'Join Now' },
    { name: 'Dance & Music', type: 'DANCE', ico: '🎸', c1: '#9b3fd1', c2: '#5f1f94', cta: 'Join Now' },
    { name: 'Tuition & Coaching', type: 'COACHING', ico: '📚', c1: '#12a9a0', c2: '#0b6f8f', cta: 'Enroll Now' },
    { name: 'Yoga & Wellness', type: 'YOGA', ico: '🧘', c1: '#0b4aa8', c2: '#062b55', cta: 'Get Started' },
  ];
  benefits = [{ i: '🤝', t: 'Trusted Partners' }, { i: '🏅', t: 'Exclusive Discounts' }, { i: '📜', t: 'Appreciation Certificate' }, { i: '📈', t: 'Boost Your Career' }];
  async ngOnInit() { try { this.ads.set((await this.api.get('/public/ads')).ads); } catch { /* sponsors are optional */ } }
}
