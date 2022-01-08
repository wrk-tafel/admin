import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuardService implements CanActivateChild {

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) { }

  canActivateChild(route: ActivatedRouteSnapshot): boolean {
    const expectedPermission = route.data.expectedPermission;
    if (!this.auth.hasRole(expectedPermission)) {
      this.router.navigate(['dashboard']);
      return false;
    }
    return true;
  }

}
