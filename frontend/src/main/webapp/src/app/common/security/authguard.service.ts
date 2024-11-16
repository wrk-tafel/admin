import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

  constructor(private authenticationService: AuthenticationService) {
  }

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
