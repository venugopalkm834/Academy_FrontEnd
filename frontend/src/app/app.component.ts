import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { APP_VERSION } from './core/config/version';
import { ApiService } from './core/services/api.service';

const REQUIRED_API = APP_VERSION;

@Component({ selector: 'ac-root', imports: [RouterOutlet], templateUrl: './app.component.html', styleUrl: './app.component.scss' })
export class AppComponent implements OnInit {
  private api = inject(ApiService);
  problem = signal('');
  async ngOnInit() {
    try {
      const h = await this.api.get('/health');
      if (h.version !== REQUIRED_API) this.problem.set(`The backend is out of date (v${h.version || 'old'}, expected v${REQUIRED_API})${h.folder ? ' and is running from ' + h.folder : ''}. Stop it, replace that backend folder with the one from the latest zip, run "npm install" and "npm run dev".`);
    } catch { this.problem.set('Cannot reach the backend (port 5000). In the project folder run "npm start" and read the first red error. Still stuck? Run "npm run doctor". On the server run: docker compose logs --tail=60 backend'); }
  }
}
