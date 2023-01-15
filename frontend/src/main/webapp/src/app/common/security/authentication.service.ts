import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
  }

  userInfo?: UserInfo;

  public async login(username: string, password: string): Promise<LoginResult> {
    return this.executeLoginRequest(username, password)
      .pipe(map(response => {
          this.loadUserInfo();
          return {successful: true, passwordChangeRequired: response.passwordChangeRequired};
        }),
        catchError(_ => {
          this.userInfo = undefined;
          return of({successful: false, passwordChangeRequired: false});
        }))
      .toPromise();
  }

  public redirectToLogin(msgKey?: string) {
    this.router.navigate(['login', msgKey].filter(cmd => cmd));
  }

  public hasAnyPermission(): boolean {
    return this.userInfo?.permissions.length > 0;
  }

  public hasPermission(role: string): boolean {
    if (this.hasAnyPermission()) {
      const index = this.userInfo?.permissions.findIndex(element => {
        return element.toLowerCase() === role.toLowerCase();
      });
      return index !== -1;
    }
    return false;
  }

  public getUsername(): string {
    return this.userInfo?.username;
  }

  public logout(): Observable<void> {
    this.userInfo = undefined;
    return this.http.post<void>('/users/logout', null);
  }

  private executeLoginRequest(username: string, password: string): Observable<LoginResponse> {
    const encodedCredentials = btoa(username + ':' + password);
    const options = {
      headers: new HttpHeaders().set('Authorization', 'Basic ' + encodedCredentials),
      withCredentials: true
    };
    return this.http.post<LoginResponse>('/login', undefined, options);
  }

  public loadUserInfo() {
    return this.http.get<UserInfo>('/users/info')
      .subscribe(userInfo => {
        this.userInfo = userInfo;
      });
  }

}

interface LoginResponse {
  passwordChangeRequired: boolean;
}

export interface LoginResult {
  successful: boolean;
  passwordChangeRequired: boolean;
}

interface UserInfo {
  username: string;
  permissions: string[];
}
