import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) { }

  canActivate(): boolean {
    let authenticated = this.auth.isAuthenticated()
    if (!authenticated) {
      this.router.navigate(['login']);
      return false;
    }
    return true;
  }

}
