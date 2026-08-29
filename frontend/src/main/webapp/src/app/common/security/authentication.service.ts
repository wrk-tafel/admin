import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {inject, Service, signal} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom, Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../http/suppress-error-toast.token';
import {GlobalStateService} from '../state/global-state.service';

@Service()
export class AuthenticationService {
  userInfo = signal<UserInfo | null>(null);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly globalStateService = inject(GlobalStateService);

  /**
   * Logs in and, on success, also loads the user's permissions before resolving - callers can
   * treat a resolved `login()` as "userInfo() is already populated", no separate wait needed.
   * A `429` (this IP's request rate exceeded, see RateLimitFilter) is not treated as a request
   * failure: it resolves with `{successful: false, rateLimited: true}` rather than rejecting, so the
   * login form can show a dedicated message instead of a generic error. Likewise a status of `0`
   * (request never reached a server, e.g. offline/DNS/CORS) or `5xx` resolves with
   * `serverUnreachable: true` rather than the generic failure message - wrong credentials, and a
   * locked-out account/IP, both come back as a plain `403` (deliberately indistinguishable from each
   * other server-side - see TafelLoginFilter), which is neither of those, so the two are never
   * confused.
   */
  public async login(username: string, password: string): Promise<LoginResult> {
    return firstValueFrom(this.executeLoginRequest(username, password)
      .pipe(map(async response => {
          await this.loadUserInfo();
          return {
            successful: true,
            passwordChangeRequired: response.passwordChangeRequired,
            rateLimited: false,
            serverUnreachable: false
          };
        }),

        catchError((error: HttpErrorResponse) => {
          this.userInfo.set(null);
          const rateLimited = error.status === 429;
          const serverUnreachable = !rateLimited && (error.status === 0 || error.status >= 500);
          return of({successful: false, passwordChangeRequired: false, rateLimited, serverUnreachable});
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
   *
   * Also drops the last `/sse/distributions` snapshot ({@link GlobalStateService#reset}) - that
   * stream itself stays open across the logout by design, but without this a re-login in the same
   * tab would render the previous session's distribution state until the next SSE message arrives.
   */
  public logout(): Observable<void> {
    return this.http.post<void>('/users/logout', null).pipe(
      catchError(() => of(undefined)),
      switchMap(() => this.redirectToLogin()),
      tap(() => {
        this.userInfo.set(null);
        this.globalStateService.reset();
      }),
      map(() => undefined)
    );
  }

  /**
   * On failure (e.g. an expired/invalid session), also clears `userInfo` rather than leaving the
   * previous value in place - otherwise {@link isAuthenticated} would keep reporting the old
   * session as authenticated after this fails.
   */
  public loadUserInfo(): Promise<UserInfo | null> {
    return firstValueFrom(this.http.get<UserInfo>('/users/info', {context: SUPPRESS_ERROR_TOAST_CONTEXT})
      .pipe(tap(userInfo => {
          this.userInfo.set(userInfo);
          return of(userInfo);
        }),

        catchError(_ => {
          this.userInfo.set(null);
          return of(null);
        })
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
  rateLimited: boolean;
  serverUnreachable: boolean;
}

interface UserInfo {
  username: string;
  permissions: string[];
}
