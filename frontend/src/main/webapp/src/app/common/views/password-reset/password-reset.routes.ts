import {Routes} from '@angular/router';
import {ForgotPasswordComponent} from './forgot-password.component';
import {ResetPasswordComponent} from './reset-password.component';

/**
 * The two pages of "Passwort vergessen?", reachable without a session. One lazy chunk for both, so
 * they add nothing to what the login page loads (see `check-eager-bundle.cjs`, ADR-0037). The paths
 * are listed again in `app.routes.ts`'s matcher - importing them from here would make this file eager.
 */
export const routes: Routes = [
  {
    path: 'passwort-vergessen',
    title: 'Passwort vergessen',
    component: ForgotPasswordComponent
  },
  {
    path: 'passwort-zuruecksetzen',
    title: 'Neues Passwort festlegen',
    component: ResetPasswordComponent
  }
];
