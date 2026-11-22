import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-verify-member', imports: [DatePipe, LowerCasePipe], templateUrl: './verify-member.component.html', styleUrl: './verify-member.component.scss' })
export class VerifyMemberComponent implements OnInit {
  private api = inject(ApiService);
  private code = inject(ActivatedRoute).snapshot.paramMap.get('code');
  r = signal<any>(null); error = signal('');
  async ngOnInit() { try { this.r.set(await this.api.get('/public/verify/' + this.code)); } catch (e) { this.error.set(errText(e)); } }
}
