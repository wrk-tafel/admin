import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

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
   */
  async canActivate(childRoute: ActivatedRouteSnapshot): Promise<boolean> {
    const routeData: AuthGuardData = childRoute.data;

    const authenticated = this.authenticationService.isAuthenticated();
    if (!authenticated) {
      this.authenticationService.redirectToLogin();
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
