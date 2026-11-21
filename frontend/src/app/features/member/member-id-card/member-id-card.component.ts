import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-member-id-card', imports: [DatePipe, RouterLink], templateUrl: './member-id-card.component.html', styleUrl: './member-id-card.component.scss' })
export class MemberIdCardComponent implements OnInit {
  private api = inject(ApiService);
  card = signal<any>(null); error = signal(''); loading = signal(true); busy = signal(false);
  async ngOnInit() {
    try { this.card.set(await this.api.get('/member/id-card')); } catch (e) { this.error.set(errText(e)); } finally { this.loading.set(false); }
  }
  async pdf() { this.busy.set(true); try { await this.api.download('/member/id-card.pdf', `Academic-Club-ID-${this.card().memberId}.pdf`); } catch (e) { this.error.set(errText(e)); } finally { this.busy.set(false); } }
  print() { window.print(); }
}
