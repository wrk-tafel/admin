import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
  }

  username?: string = undefined;
  permissions: string[] = [];

  public async login(username: string, password: string): Promise<LoginResult> {
    return await this.executeLoginRequest(username, password)
      .then((response: LoginResponse) => {
        this.username = response.username;
        this.permissions = response.permissions;
        return {successful: true, passwordChangeRequired: response.passwordChangeRequired};
      })
      .catch(() => {
        return {successful: false, passwordChangeRequired: false};
      });
  }

  public redirectToLogin(msgKey?: string) {
    this.router.navigate(['login', msgKey].filter(cmd => cmd));
  }

  public hasAnyPermission(): boolean {
    return this.permissions.length > 0;
  }

  public hasPermission(role: string): boolean {
    if (this.hasAnyPermission()) {
      const index = this.permissions?.findIndex(element => {
        return element.toLowerCase() === role.toLowerCase();
      });
      return index !== -1;
    }
    return false;
  }

  public getUsername(): string {
    return this.username;
  }

  public logout(): Observable<void> {
    return this.http.post<void>('/users/logout', null);
  }

  private executeLoginRequest(username: string, password: string) {
    const encodedCredentials = btoa(username + ':' + password);
    const options = {
      headers: new HttpHeaders().set('Authorization', 'Basic ' + encodedCredentials),
      withCredentials: true
    };
    return this.http.post<LoginResponse>('/login', undefined, options).toPromise();
  }

}

interface LoginResponse {
  username: string;
  permissions: string[];
  passwordChangeRequired: boolean;
}

export interface LoginResult {
  successful: boolean;
  passwordChangeRequired: boolean;
}
