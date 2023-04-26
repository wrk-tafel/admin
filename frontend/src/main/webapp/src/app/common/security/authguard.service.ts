import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateChild, RouterStateSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivateChild {

  constructor(
    private auth: AuthenticationService
  ) {
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.auth.hasAnyPermission()) {
      this.auth.redirectToLogin('fehlgeschlagen');
      return false;
    }

    const permission = childRoute.data.permission;
    if (permission == null || this.auth.hasPermission(permission)) {
      return true;
    }

    this.auth.redirectToLogin('fehlgeschlagen');
    return false;
  }

}
