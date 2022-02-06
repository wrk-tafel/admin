import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivateChild {

  constructor(
    private auth: AuthenticationService
  ) { }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    let authenticated = this.auth.isAuthenticated()
    if (!authenticated) {
      this.auth.logoutAndRedirectExpired();
      return false;
    }
    return true;
  }

}
