import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

  constructor(
    private auth: AuthenticationService
  ) {
  }

  canActivate(childRoute: ActivatedRouteSnapshot): boolean {
    const routeData: AuthGuardData = childRoute.data;

    const authenticated = this.auth.isAuthenticated();
    const needsAnyPermission = routeData.anyPermission;
    const hasAnyPermission = this.auth.hasAnyPermission();

    if (!authenticated || (needsAnyPermission && !hasAnyPermission)) {
      this.auth.redirectToLogin('fehlgeschlagen');
      return false;
    }

    const permission = routeData.permission;
    if (permission == null || this.auth.hasPermission(permission)) {
      return true;
    }

    this.auth.redirectToLogin('fehlgeschlagen');
    return false;
  }

}

export interface AuthGuardData {
  anyPermission?: boolean;
  permission?: string;
}
