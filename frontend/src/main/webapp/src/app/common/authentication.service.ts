import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  private LOCAL_STORAGE_TOKEN_KEY: string = "JWT_TOKEN"

  constructor(
    public jwtHelper: JwtHelperService
  ) { }

  public login(username: string, password: string) {
    // TODO execute request to /api/login and parse token
    // TODO maybe not in localstorage?
    let token = "TEST"
    localStorage.setItem(this.LOCAL_STORAGE_TOKEN_KEY, token)
  }

  public isAuthenticated(): boolean {
    // TODO impl
    /*
    let token = localStorage.getItem(this.LOCAL_STORAGE_TOKEN_KEY)
    return token !== null && !this.jwtHelper.isTokenExpired(token)
    */
    return true
  }

  public hasRole(role: string): boolean {
    // TODO impl
    return true
  }

}
