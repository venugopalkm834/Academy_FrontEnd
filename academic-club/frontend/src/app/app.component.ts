import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';

const REQUIRED_API = '0.9.0';

@Component({ selector: 'ac-root', imports: [RouterOutlet], templateUrl: './app.component.html', styleUrl: './app.component.scss' })
export class AppComponent implements OnInit {
  private api = inject(ApiService);
  problem = signal('');
  async ngOnInit() {
    try {
      const h = await this.api.get('/health');
      if (h.version !== REQUIRED_API) this.problem.set(`The backend is out of date (v${h.version || 'old'}, expected v${REQUIRED_API})${h.folder ? ' and is running from ' + h.folder : ''}. Stop it, replace that backend folder with the one from the latest zip, run "npm install" and "npm run dev".`);
    } catch { this.problem.set('Cannot reach the backend on port 5000. Start it with "npm run dev" in the backend folder.'); }
  }
}
