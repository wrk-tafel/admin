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
