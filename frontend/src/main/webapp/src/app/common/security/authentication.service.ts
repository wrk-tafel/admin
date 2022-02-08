import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private LOCAL_STORAGE_TOKEN_KEY = 'JWT_TOKEN';

  constructor(
    private jwtHelper: JwtHelperService,
    private http: HttpClient,
    private router: Router
  ) { }

  public async login(username: string, password: string): Promise<boolean> {
    return await this.executeLoginRequest(username, password)
      .then(response => {
        this.storeToken(response);
        return true;
      })
      .catch(() => {
        this.removeToken();
        return false;
      });
  }

  public logoutAndRedirect() {
    this.removeToken();
    this.router.navigate(['login']);
  }

  public logoutAndRedirectExpired() {
    this.removeToken();
    this.router.navigate(['login'], { state: { errorType: 'expired' } });
  }

  public isAuthenticated(): boolean {
    const token = this.readToken();
    if (token !== null) {
      const expired = this.jwtHelper.isTokenExpired(token);
      if (expired) {
        this.removeToken();
      } else {
        return true;
      }
    }
    return false;
  }

  public hasRole(role: string): boolean {
    const token = this.jwtHelper.decodeToken<JwtToken>(this.readToken());

    if (token.roles != null) {
      const index = token.roles.findIndex(element => {
        return element.toLowerCase() === role.toLowerCase();
      });

      return index !== -1;
    }

    return false;
  }

  public getToken(): string {
    return this.readToken();
  }

  public removeToken() {
    localStorage.removeItem(this.LOCAL_STORAGE_TOKEN_KEY);
  }

  private executeLoginRequest(username: string, password: string) {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);

    const options = { headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded') };
    return this.http.post<LoginResponse>('/login', body.toString(), options).toPromise();
  }

  private storeToken(response: LoginResponse) {
    localStorage.setItem(this.LOCAL_STORAGE_TOKEN_KEY, response.token);
  }

  private readToken(): string {
    return localStorage.getItem(this.LOCAL_STORAGE_TOKEN_KEY);
  }

}

interface LoginResponse {
  token: string;
}

interface JwtToken {
  roles: string[];
}
