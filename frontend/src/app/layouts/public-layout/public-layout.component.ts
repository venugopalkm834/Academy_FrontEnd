import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WhatsappFabComponent } from '../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { ContactService } from '../../core/services/contact.service';
import { AuthService } from '../../core/auth/auth.service';
import { APP_VERSION } from '../../core/config/version';
import { homeFor } from '../../core/auth/auth.helpers';

@Component({
  selector: 'ac-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, WhatsappFabComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent {
  open = false;
  version = APP_VERSION;
  auth = inject(AuthService);
  contact = inject(ContactService);
  constructor() { this.contact.load(); }
  home = homeFor;
}
