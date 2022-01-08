import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
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
      this.router.navigate(['login']);
      return false;
    }
    return true;
  }

}
