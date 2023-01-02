import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {JwtHelperService} from '@auth0/angular-jwt';
import {toBase64String} from "@angular/compiler/src/output/source_map";

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private SESSION_STORAGE_TOKEN_KEY = 'jwt';

  constructor(
    private jwtHelper: JwtHelperService,
    private http: HttpClient,
    private router: Router
  ) {
  }

  public async login(username: string, password: string): Promise<LoginResult> {
    return await this.executeLoginRequest(username, password)
      .then((response: LoginResponse) => {
        this.storeToken(response);
        return {successful: true, passwordChangeRequired: response.passwordChangeRequired};
      })
      .catch(() => {
        this.removeToken();
        return {successful: false, passwordChangeRequired: false};
      });
  }

  public logoutAndRedirect() {
    const token = this.getTokenString();
    if (token !== null) {
      const expired = this.jwtHelper.isTokenExpired(token);
      if (expired) {
        this.removeToken();
        this.router.navigate(['login', 'abgelaufen']);
      } else {
        this.removeToken();
        this.router.navigate(['login']);
      }
    } else {
      this.router.navigate(['login']);
    }
  }

  public isAuthenticated(): boolean {
    const token = this.getTokenString();
    return token !== null && !this.jwtHelper.isTokenExpired(token);
  }

  public hasAnyPermissions(): boolean {
    return this.decodeToken().permissions?.length > 0;
  }

  public hasPermission(role: string): boolean {
    if (this.hasAnyPermissions()) {
      const index = this.decodeToken().permissions?.findIndex(element => {
        return element.toLowerCase() === role.toLowerCase();
      });
      return index !== -1;
    }
    return false;
  }

  public getTokenString(): string {
    return sessionStorage.getItem(this.SESSION_STORAGE_TOKEN_KEY);
  }

  public removeToken() {
    sessionStorage.removeItem(this.SESSION_STORAGE_TOKEN_KEY);
  }

  public getUsername(): string {
    return this.decodeToken()?.sub;
  }

  private executeLoginRequest(username: string, password: string) {
    const encodedCredentials = btoa(username + ':' + password);
    const options = {headers: new HttpHeaders().set('Authorization', 'Basic ' + encodedCredentials)};
    return this.http.post<LoginResponse>('/login', undefined, options).toPromise();
  }

  private storeToken(response: LoginResponse) {
    sessionStorage.setItem(this.SESSION_STORAGE_TOKEN_KEY, response.token);
  }

  private decodeToken(): JwtToken {
    return this.jwtHelper.decodeToken<JwtToken>(this.getTokenString());
  }
}

interface LoginResponse {
  token: string;
  passwordChangeRequired: boolean;
}

interface JwtToken {
  sub: string;
  permissions: string[];
}

export interface LoginResult {
  successful: boolean;
  passwordChangeRequired: boolean;
}
