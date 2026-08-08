import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {inject, Service, signal} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom, Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../http/suppress-error-toast.token';

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

  public redirectToLogin(msgKey?: string): Promise<boolean> {
    return this.router.navigate(['login', msgKey].filter(cmd => cmd));
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

  /**
   * Ends the session server-side, then navigates to the login page, and only then drops the
   * cached user info - in that order. `userInfo` backs every permission check, so clearing it
   * while the current page is still on screen empties its `tafelIfPermission` blocks (dashboard
   * panels, sidebar entries) for as long as the request takes, which shows up as a flicker right
   * before the redirect.
   *
   * A failed request still completes the logout locally - the user asked to leave, and the error
   * interceptor has already surfaced the failure.
   */
  public logout(): Observable<void> {
    return this.http.post<void>('/users/logout', null).pipe(
      catchError(() => of(undefined)),
      switchMap(() => this.redirectToLogin()),
      tap(() => this.userInfo.set(null)),
      map(() => undefined)
    );
  }

  public loadUserInfo(): Promise<UserInfo | null> {
    return firstValueFrom(this.http.get<UserInfo>('/users/info', {context: SUPPRESS_ERROR_TOAST_CONTEXT})
      .pipe(tap(userInfo => {
          this.userInfo.set(userInfo);
          return of(userInfo);
        }),

        catchError(_ => of(null))
      ));
  }

  /**
   * Base64 of the credentials' **UTF-8** bytes, as RFC 7617 recommends and as the server's
   * `BasicAuthenticationConverter` reads them. `btoa` alone maps every code unit to a single byte,
   * i.e. encodes Latin-1, which turns a password with an umlaut into bytes that aren't valid UTF-8
   * and made every such login fail (see #3100).
   */
  private encodeCredentials(username: string, password: string): string {
    const bytes = new TextEncoder().encode(username + ':' + password);
    return btoa(String.fromCharCode(...bytes));
  }

  private executeLoginRequest(username: string, password: string): Observable<LoginResponse> {
    const encodedCredentials = this.encodeCredentials(username, password);
    const options = {
      headers: new HttpHeaders().set('Authorization', 'Basic ' + encodedCredentials),
      context: SUPPRESS_ERROR_TOAST_CONTEXT
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
