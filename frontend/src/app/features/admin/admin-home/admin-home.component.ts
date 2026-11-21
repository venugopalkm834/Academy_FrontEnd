import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { errText } from '../../../core/utils/error.util';

@Component({ selector: 'ac-admin-home', imports: [RouterLink, CurrencyPipe], templateUrl: './admin-home.component.html', styleUrl: './admin-home.component.scss' })
export class AdminHomeComponent implements OnInit {
  private api = inject(ApiService);
  d = signal<any>(null); error = signal('');
  async ngOnInit() { try { this.d.set(await this.api.get('/admin/dashboard')); } catch (e) { this.error.set(errText(e)); } }
}
