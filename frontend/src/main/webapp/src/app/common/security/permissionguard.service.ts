import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateChild, Router} from '@angular/router';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuardService implements CanActivateChild {

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) {
  }

  canActivateChild(route: ActivatedRouteSnapshot): boolean {
    const permissions = this.auth.getPermissions();
    if (permissions.length == 0) {
      this.router.navigate(['login', 'forbidden']);
      return false;
    }

    const expectedPermission = route.data.expectedPermission;
    if (expectedPermission != null && this.auth.hasPermission(expectedPermission)) {
      return true;
    }

    this.router.navigate(['uebersicht']);
    return false;
  }

}
