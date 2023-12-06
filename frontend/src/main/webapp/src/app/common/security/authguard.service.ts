import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

  constructor(private authenticationService: AuthenticationService) {
  }

  canActivate(childRoute: ActivatedRouteSnapshot): boolean {
    const routeData: AuthGuardData = childRoute.data;

    const authenticated = this.authenticationService.isAuthenticated();
    const needsAnyPermission = routeData.anyPermission;
    const hasAnyPermission = this.authenticationService.hasAnyPermission();

    if (!authenticated || (needsAnyPermission && !hasAnyPermission)) {
      this.authenticationService.redirectToLogin('fehlgeschlagen');
      return false;
    }

    const permission = routeData.permission;
    if (permission == null || this.authenticationService.hasPermission(permission)) {
      return true;
    }

    this.authenticationService.redirectToLogin('fehlgeschlagen');
    return false;
  }

}

export interface AuthGuardData {
  anyPermission?: boolean;
  permission?: string;
}
