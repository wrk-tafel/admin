import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, Router, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivateChild {

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) { }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    let authenticated = this.auth.isAuthenticated()
    if (!authenticated) {
      this.router.navigate(['login'], { state: { errorType: 'expired' } });
      return false;
    }
    return true;
  }

}
