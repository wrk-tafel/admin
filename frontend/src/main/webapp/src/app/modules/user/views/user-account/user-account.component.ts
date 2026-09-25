import {Component} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatTabLink, MatTabNav, MatTabNavPanel} from '@angular/material/tabs';

/**
 * The frame of "Mein Konto": a tab per topic (`account.routes.ts`), each showing the component of its child route.
 * The tabs are links rather than content switched in place, so the address says which one is open and the back
 * button, a bookmark and the redirect for a required second factor all land on the right tab.
 */
@Component({
  selector: 'tafel-user-account',
  templateUrl: 'user-account.component.html',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel
  ]
})
export class UserAccountComponent {
  readonly tabs = [
    {path: 'daten', label: 'Meine Daten', testId: 'account-tab-data'},
    {path: 'passwort', label: 'Passwort', testId: 'account-tab-password'},
    {path: 'zwei-faktor', label: 'Zwei-Faktor-Authentifizierung', testId: 'account-tab-mfa'},
    {path: 'benachrichtigungen', label: 'Benachrichtigungen', testId: 'account-tab-notifications'},
    {path: 'design', label: 'Design', testId: 'account-tab-theme'},
    {path: 'datenschutz', label: 'Datenschutz', testId: 'account-tab-privacy'}
  ] as const;

  /**
   * On a narrow screen the tabs overflow and scroll sideways (no pagination arrows, see `mat-tabs.scss`), so a tab
   * that is opened by its address or by the back button may sit outside the visible part of the bar.
   */
  reveal(tab: HTMLElement) {
    // After the fonts: the tabs are wider once the web font has replaced the fallback, and a scroll position
    // worked out before that lands short of the tab.
    (document.fonts?.ready ?? Promise.resolve()).then(() => tab.scrollIntoView?.({inline: 'center', block: 'nearest'}));
  }
}
