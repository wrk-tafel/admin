import {Routes} from '@angular/router';
import {UserPasswordChangeComponent} from './components/user-passwordchange/user-passwordchange.component';
import {UserThemeSettingsComponent} from './components/user-theme-settings/user-theme-settings.component';
import {UserPrivacySettingsComponent} from './components/user-privacy-settings/user-privacy-settings.component';
import {PushNotificationSettingsComponent} from './components/push-notification-settings/push-notification-settings.component';

/**
 * "Mein Konto": one page for what a user settles about their own login and device, one tab per topic. The tabs are
 * child routes, so each has an address of its own - the two-factor tab is where a session that has to set up a
 * second factor is sent (see `AuthGuardService`), the others can be linked to.
 *
 * These are the children of the `konto` route in `shell.routes.ts`, which renders them inside `UserAccountComponent`.
 * That route is the frame itself rather than a parent with an empty path, because `AuthGuardService` recognises the
 * routes a session that must set up a second factor may open by their path (`konto`, `zwei-faktor`).
 * It sits behind the login only: every user has an account, whatever their permissions.
 */
export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'passwort'},
  {
    path: 'passwort',
    title: 'Mein Konto - Passwort',
    component: UserPasswordChangeComponent
  },
  {
    path: 'zwei-faktor',
    title: 'Mein Konto - Zwei-Faktor-Authentifizierung',
    loadComponent: () => import('./components/user-mfa/user-mfa.component').then(m => m.UserMfaComponent)
  },
  {
    path: 'benachrichtigungen',
    title: 'Mein Konto - Benachrichtigungen',
    component: PushNotificationSettingsComponent
  },
  {
    path: 'design',
    title: 'Mein Konto - Design',
    component: UserThemeSettingsComponent
  },
  {
    path: 'datenschutz',
    title: 'Mein Konto - Datenschutz',
    component: UserPrivacySettingsComponent
  }
];
