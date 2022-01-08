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
        this.storeToken(response)
        this.router.navigate(['dashboard'])
      })

    // TODO errorhandling
  }

  public isAuthenticated(): boolean {
    // TODO check signature ?
    let token = this.readToken()
    return token !== null && !this.jwtHelper.isTokenExpired(token)
  }

  public hasRole(role: string): boolean {
    let token = this.jwtHelper.decodeToken<JwtToken>(this.readToken())

    let index = token.roles.findIndex(element => {
      return element.toLowerCase() === role.toLowerCase();
    });

    return index !== -1
  }

  public getToken(): string {
    return this.readToken()
  }

  private executeLoginRequest(username: string, password: string) {
    let body = new URLSearchParams();
    body.set("username", username);
    body.set("password", password);

    let options = { headers: new HttpHeaders().set("Content-Type", "application/x-www-form-urlencoded") }
    return this.http.post<LoginResponse>("/login", body.toString(), options);
  }

  private storeToken(response: LoginResponse) {
    localStorage.setItem(this.LOCAL_STORAGE_TOKEN_KEY, response.token)
  }

  private readToken(): string {
    return localStorage.getItem(this.LOCAL_STORAGE_TOKEN_KEY)
  }

}

type LoginResponse = {
  token: string
}

type JwtToken = {
  roles: string[]
}
