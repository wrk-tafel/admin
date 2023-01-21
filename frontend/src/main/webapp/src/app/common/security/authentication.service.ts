import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {combineLatest, Observable, of} from 'rxjs';
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

  userInfo: UserInfo = null;

  public async login(username: string, password: string): Promise<LoginResult> {
    const executeLoginObservable = this.executeLoginRequest(username, password)
      .pipe(map(response => {
          return {successful: true, passwordChangeRequired: response.passwordChangeRequired};
        }),
        catchError(_ => {
          this.userInfo = null;
          return of({successful: false, passwordChangeRequired: false});
        }));

    const loadUserInfoPromise = this.loadUserInfo();

    return combineLatest([executeLoginObservable, loadUserInfoPromise]).pipe(
      map(result => {
        return result[0];
      })
    ).toPromise();
  }

  public isAuthenticated(): Boolean {
    return this.userInfo !== null;
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
    this.userInfo = null;
    return this.http.post<void>('/users/logout', null);
  }

  private executeLoginRequest(username: string, password: string): Observable<LoginResponse> {
    const encodedCredentials = btoa(username + ':' + password);
    const options = {
      headers: new HttpHeaders().set('Authorization', 'Basic ' + encodedCredentials)
    };
    return this.http.post<LoginResponse>('/login', undefined, options);
  }

  public loadUserInfo(): Promise<UserInfo> {
    return this.http.get<UserInfo>('/users/info')
      .pipe(tap(userInfo => {
          this.userInfo = userInfo;
          return of(userInfo);
        }),
        catchError(_ => {
          return of(null);
        })
      ).toPromise();
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
