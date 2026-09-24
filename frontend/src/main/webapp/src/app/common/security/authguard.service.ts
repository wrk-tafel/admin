import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

/**
 * The routes a session that must set up a second factor may open: the two-factor tab of the account page and the
 * account page itself, which is the parent the tab is rendered in (see account.routes.ts).
 */
const MFA_SETUP_PATHS = ['konto', 'zwei-faktor'];

@Service()
export class AuthGuardService {
  private readonly authenticationService = inject(AuthenticationService);

  /**
   * Route guard combining login state with two independent, route-data-driven permission checks:
   * `anyPermission: true` only asks "is the user authorized for *something*" (used by shared
   * screens like the dashboard), while `anyPermissionOf: string[]` requires one specific
   * permission from that list (used by feature modules gated on e.g. `SCANNER`/`CHECKIN`). A
   * route can set both; failing either redirects to the login page.
   *
   * Not being logged in at all (e.g. a fresh visit to `/`, which redirects to `uebersicht`) is
   * not the same as being logged in but lacking a permission - the former sends the user to a
   * plain login page, the latter shows the "access denied" message via the `fehlgeschlagen`
   * error key so it isn't misreported as a real authorization failure.
   *
   * A cached "authenticated" flag alone can't tell a live session from one that expired
   * server-side without any HTTP request happening yet (e.g. a menu click to a route with no
   * resolver/data call of its own) - so whenever we still believe we're authenticated, this
   * revalidates against the server first. If that revalidation itself 401s, the
   * errorHandlerInterceptor's auth-error handling already redirects with the `abgelaufen`
   * message as a side effect of the failed request, so this only needs to stop the navigation.
   */
  async canActivate(childRoute: ActivatedRouteSnapshot): Promise<boolean> {
    const routeData: AuthGuardData = childRoute.data;

    const wasAuthenticated = this.authenticationService.isAuthenticated();
    const userInfo = wasAuthenticated ? await this.authenticationService.loadUserInfo() : null;
    if (userInfo === null) {
      if (!wasAuthenticated) {
        this.authenticationService.redirectToLogin();
      }
      return false;
    }

    // A login that still owes its code has no permissions yet - send it to the code page rather than
    // letting the empty list read as "access denied".
    if (this.authenticationService.isMfaPending()) {
      this.authenticationService.redirectToMfa();
      return false;
    }

    // The deployment requires a second factor and this user has none: the only page that works is the one
    // that sets it up, so any other route leads there (and that one is let through, it has no permission to ask).
    if (this.authenticationService.isMfaSetupRequired()) {
      if (MFA_SETUP_PATHS.includes(childRoute.routeConfig?.path ?? '')) {
        return true;
      }
      this.authenticationService.redirectToMfaSetup();
      return false;
    }

    const needsAnyPermission = routeData.anyPermission;
    const hasAnyPermission = this.authenticationService.hasAnyPermission();

    if (needsAnyPermission && !hasAnyPermission) {
      this.authenticationService.redirectToLogin('fehlgeschlagen');
      return false;
    }

    const permissions = routeData.anyPermissionOf;
    if (permissions == null || this.authenticationService.hasAnyPermissionOf(permissions)) {
      return true;
    }

    this.authenticationService.redirectToLogin('fehlgeschlagen');
    return false;
  }

}

export interface AuthGuardData {
  anyPermission?: boolean;
  anyPermissionOf?: string[];
}
