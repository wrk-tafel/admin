import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  private LOCAL_STORAGE_TOKEN_KEY: string = "JWT_TOKEN"

  constructor(
    private jwtHelper: JwtHelperService,
    private http: HttpClient,
    private router: Router
  ) { }

  public login(username: string, password: string) {
    this.executeLoginRequest(username, password)
      .subscribe(response => {
        localStorage.setItem(this.LOCAL_STORAGE_TOKEN_KEY, response.token)
        this.router.navigate(['dashboard'])
      })

    // TODO errorhandling
  }

  public isAuthenticated(): boolean {
    // TODO check signature?
    let token = localStorage.getItem(this.LOCAL_STORAGE_TOKEN_KEY)
    return token !== null && !this.jwtHelper.isTokenExpired(token)
  }

  public hasRole(role: string): boolean {
    // TODO impl
    return true
  }

  private executeLoginRequest(username: string, password: string) {
    let body = new URLSearchParams();
    body.set("username", username);
    body.set("password", password);

    return this.http.post<LoginResponse>(
      "/login",
      body.toString(),
      {
        headers: new HttpHeaders().set("Content-Type", "application/x-www-form-urlencoded")
      });
  }

}

type LoginResponse = {
  token: string
}
