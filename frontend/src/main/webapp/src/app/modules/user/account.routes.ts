import {Routes} from '@angular/router';
import {UserAccountDataComponent} from './components/user-account-data/user-account-data.component';
import {UserPasswordChangeComponent} from './components/user-passwordchange/user-passwordchange.component';
import {UserThemeSettingsComponent} from './components/user-theme-settings/user-theme-settings.component';
import {UserPrivacySettingsComponent} from './components/user-privacy-settings/user-privacy-settings.component';
import {PushNotificationSettingsComponent} from './components/push-notification-settings/push-notification-settings.component';

/**
 * "Mein Konto": one page for what a user settles about their own account, login and device, one tab per topic. The
 * tabs are child routes, so each has an address of its own and can be linked to. `/konto` itself lands on the first
 * tab, the user's own data.
 *
 * These are the children of the `konto` route in `shell.routes.ts`, which renders them inside `UserAccountComponent`.
 * It sits behind the login only: every user has an account, whatever their permissions. A session that still has to
 * set a second factor up never reaches here at all - `AuthGuardService` sends it to `LoginMfaSetupComponent` on the
 * login flow instead, so the two-factor tab only ever shows a method that is already active or being changed.
 */
export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'daten'},
  {
    path: 'daten',
    title: 'Mein Konto - Meine Daten',
    component: UserAccountDataComponent
  },
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
