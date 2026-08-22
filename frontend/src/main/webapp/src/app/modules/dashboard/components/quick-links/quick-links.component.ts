import {Component, computed, inject} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {RouterLink} from '@angular/router';
import {AuthenticationService} from '../../../../common/security/authentication.service';

interface QuickLink {
  testId: string;
  label: string;
  url: string;
  permission: string;
}

const QUICK_LINKS: QuickLink[] = [
  {testId: 'customers-search', label: 'Kunden suchen', url: '/kunden/suchen', permission: 'CUSTOMER'},
  {testId: 'customers-create', label: 'Kunden anlegen', url: '/kunden/anlegen', permission: 'CUSTOMER'},
  {testId: 'customers-quickcheck', label: 'Anspruch-Schnellcheck', url: '/kunden/schnellcheck', permission: 'CUSTOMER'},
  {testId: 'users-search', label: 'Benutzer suchen', url: '/benutzer/suchen', permission: 'USER_MANAGEMENT'},
  {testId: 'statistics', label: 'Statistiken', url: '/statistiken/allgemein', permission: 'STATISTICS'},
  {testId: 'audit-log', label: 'Änderungsprotokoll', url: '/aenderungsprotokoll', permission: 'AUDIT_LOG'},
  // '/einstellungen' alone has no matching route (settings.routes.ts has no '' path - the sidebar
  // never navigates there itself, see DefaultLayoutComponent's template, only expands its children)
  // and renders a blank page, so this links straight to its first child screen instead.
  {testId: 'settings', label: 'Einstellungen', url: '/einstellungen/fahrzeuge', permission: 'SETTINGS'},
];

@Component({
  selector: 'tafel-quick-links',
  templateUrl: 'quick-links.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatButton,
    RouterLink,
  ]
})
export class QuickLinksComponent {
  private readonly authenticationService = inject(AuthenticationService);

  readonly links = computed(() => QUICK_LINKS.filter(link => this.authenticationService.hasPermission(link.permission)));
}
