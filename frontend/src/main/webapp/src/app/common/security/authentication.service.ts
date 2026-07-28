import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {inject, Service, signal} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom, Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

@Service()
export class AuthenticationService {
  userInfo = signal<UserInfo | null>(null);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /**
   * Logs in and, on success, also loads the user's permissions before resolving - callers can
   * treat a resolved `login()` as "userInfo() is already populated", no separate wait needed.
   * A `423` (account locked) is not treated as a request failure: it resolves with
   * `{successful: false, locked: true}` rather than rejecting, so the login form can show a
   * dedicated "account locked" message instead of a generic error.
   */
  public async login(username: string, password: string): Promise<LoginResult> {
    return firstValueFrom(this.executeLoginRequest(username, password)
      .pipe(map(async response => {
          await this.loadUserInfo();
          return {successful: true, passwordChangeRequired: response.passwordChangeRequired, locked: false};
        }),

        catchError((error: HttpErrorResponse) => {
          this.userInfo.set(null);
          return of({successful: false, passwordChangeRequired: false, locked: error.status === 423});
        })));
  }

  public isAuthenticated(): boolean {
    return this.userInfo() !== null;
  }

  public redirectToLogin(msgKey?: string) {
    this.router.navigate(['login', msgKey].filter(cmd => cmd));
  }

  public hasAnyPermission(): boolean {
    return (this.userInfo()?.permissions.length ?? 0) > 0;
  }

  public hasPermission(permission: string): boolean {
    return this.hasAnyPermissionOf([permission]);
  }

  public hasAnyPermissionOf(permissions: string[]): boolean {
    const foundPermissions = this.userInfo()?.permissions.filter(permission => permissions.indexOf(permission) > -1) ?? [];
    return foundPermissions.length > 0;
  }

  public getUsername(): string | undefined {
    return this.userInfo()?.username;
  }

  public logout(): Observable<void> {
    this.userInfo.set(null);
    return this.http.post<void>('/users/logout', null);
  }

  public loadUserInfo(): Promise<UserInfo | null> {
    return firstValueFrom(this.http.get<UserInfo>('/users/info')
      .pipe(tap(userInfo => {
          this.userInfo.set(userInfo);
          return of(userInfo);
        }),

        catchError(_ => of(null))
      ));
  }

  private executeLoginRequest(username: string, password: string): Observable<LoginResponse> {
    const encodedCredentials = btoa(username + ':' + password);
    const options = {
      headers: new HttpHeaders().set('Authorization', 'Basic ' + encodedCredentials)
    };
    return this.http.post<LoginResponse>('/login', undefined, options);
  }

}

interface LoginResponse {
  passwordChangeRequired: boolean;
}

export interface LoginResult {
  successful: boolean;
  passwordChangeRequired: boolean;
  locked: boolean;
}

interface UserInfo {
  username: string;
  permissions: string[];
}
