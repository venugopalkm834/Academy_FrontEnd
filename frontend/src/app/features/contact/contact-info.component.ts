import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContactService } from '../../core/services/contact.service';

// Contact page for visitors (/contact) and "Help & Contact" inside the member and academy panels: details come from the admin panel
@Component({ selector: 'ac-contact-info', templateUrl: './contact-info.component.html', styleUrl: './contact-info.component.scss' })
export class ContactInfoComponent implements OnInit {
  contact = inject(ContactService);
  title = (inject(ActivatedRoute).snapshot.data['title'] as string) || 'Contact Us';
  ngOnInit() { this.contact.load(true); }
}
