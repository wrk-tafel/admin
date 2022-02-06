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

  public async login(username: string, password: string): Promise<boolean> {
    return await this.executeLoginRequest(username, password)
      .then(response => {
        this.storeToken(response)
        return true
      })
      .catch(() => {
        return false
      })
  }

  public logoutAndRedirect() {
    this.removeToken()
    this.router.navigate(['login'])
  }

  public isAuthenticated(): boolean {
    let token = this.readToken()
    if (token !== null) {
      let expired = this.jwtHelper.isTokenExpired(token)
      if (expired) {
        this.removeToken()
      }
      else {
        return true
      }
    }
    return false
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

  public removeToken() {
    localStorage.removeItem(this.LOCAL_STORAGE_TOKEN_KEY)
  }

  private executeLoginRequest(username: string, password: string) {
    let body = new URLSearchParams();
    body.set("username", username);
    body.set("password", password);

    let options = { headers: new HttpHeaders().set("Content-Type", "application/x-www-form-urlencoded") }
    return this.http.post<LoginResponse>("/login", body.toString(), options).toPromise()
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
