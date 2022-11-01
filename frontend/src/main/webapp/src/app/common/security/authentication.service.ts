import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {JwtHelperService} from '@auth0/angular-jwt';

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

  public getPermissions() {
    return this.decodeToken().permissions;
  }

  public hasPermission(role: string): boolean {
    const permissions = this.getPermissions();

    if (permissions != null) {
      const index = permissions.findIndex(element => {
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

  private executeLoginRequest(username: string, password: string) {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);

    const options = {headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')};
    return this.http.post<LoginResponse>('/login', body.toString(), options).toPromise();
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
}

interface JwtToken {
  permissions: string[];
}
