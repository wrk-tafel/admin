import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateChild, Router, RouterStateSnapshot} from '@angular/router';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivateChild {

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) {
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const authenticated = this.checkAuthentication();
    if (authenticated) {
      return this.checkPermissions(childRoute);
    }
    return false;
  }

  private checkAuthentication(): boolean {
    const authenticated = this.auth.isAuthenticated();
    if (!authenticated) {
      this.auth.logoutAndRedirect();
      return false;
    }
    return true;
  }

  private checkPermissions(route: ActivatedRouteSnapshot): boolean {
    const permissions = this.auth.getPermissions();
    if (permissions.length == 0) {
      this.router.navigate(['login', 'verweigert']);
      return false;
    }

    const expectedPermission = route.data.expectedPermission;
    if (expectedPermission == null || this.auth.hasPermission(expectedPermission)) {
      return true;
    }

    this.router.navigate(['uebersicht']);
    return false;
  }

}
