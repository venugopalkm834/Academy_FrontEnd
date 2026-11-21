import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'ac-info-page', templateUrl: './info-page.component.html', styleUrl: './info-page.component.scss' })
export class InfoPageComponent {
  data = inject(ActivatedRoute).snapshot.data as { title: string; body: string[] };
}
