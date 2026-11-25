import { Component, Input, OnInit, inject } from '@angular/core';
import { ContactService } from '../../../core/services/contact.service';

// Floating WhatsApp button. Tapping it opens a WhatsApp chat with the number the admin set.
@Component({ selector: 'ac-whatsapp-fab', templateUrl: './whatsapp-fab.component.html', styleUrl: './whatsapp-fab.component.scss' })
export class WhatsappFabComponent implements OnInit {
  @Input() lift = false; // raise it above the mobile bottom menu in the member / academy / admin panels
  contact = inject(ContactService);
  ngOnInit() { this.contact.load(); }
}
