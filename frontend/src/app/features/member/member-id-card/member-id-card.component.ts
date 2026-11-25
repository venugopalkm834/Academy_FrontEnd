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
  // Share on WhatsApp: a message with the member ID and the public verification link (works everywhere)
  waLink() { const c = this.card(); return 'https://wa.me/?text=' + encodeURIComponent(`My Academic Club membership ID card\n${c.fullName}\nMember ID: ${c.memberId}\nVerify: ${c.verifyUrl}`); }
  // On phones that can share files, send the PDF itself (choose WhatsApp in the share sheet)
  canShareFile = () => typeof navigator !== 'undefined' && !!(navigator as any).canShare && (navigator as any).canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] });
  async sharePdf() {
    this.busy.set(true);
    try {
      const file = new File([await this.api.blob('/member/id-card.pdf')], `Academic-Club-ID-${this.card().memberId}.pdf`, { type: 'application/pdf' });
      await (navigator as any).share({ files: [file], title: 'My Academic Club ID card', text: `Member ID: ${this.card().memberId}` });
    } catch (e: any) { if (e?.name !== 'AbortError') this.error.set(errText(e)); } finally { this.busy.set(false); }
  }
}
