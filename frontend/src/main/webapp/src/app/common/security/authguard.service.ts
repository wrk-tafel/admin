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
   */
  async canActivate(childRoute: ActivatedRouteSnapshot): Promise<boolean> {
    const routeData: AuthGuardData = childRoute.data;

    const authenticated = this.authenticationService.isAuthenticated();

    const needsAnyPermission = routeData.anyPermission;
    const hasAnyPermission = this.authenticationService.hasAnyPermission();

    if (!authenticated || (needsAnyPermission && !hasAnyPermission)) {
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
