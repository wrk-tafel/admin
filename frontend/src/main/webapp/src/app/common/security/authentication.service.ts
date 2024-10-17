import {HttpClient, HttpHeaders} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom, Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  userInfo: UserInfo = null;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  public async login(username: string, password: string): Promise<LoginResult> {
    return firstValueFrom(this.executeLoginRequest(username, password)
      .pipe(map(async response => {
          await this.loadUserInfo();
          return {successful: true, passwordChangeRequired: response.passwordChangeRequired};
        }),
        /* eslint-disable @typescript-eslint/no-unused-vars */
        catchError(_ => {
          this.userInfo = null;
          return of({successful: false, passwordChangeRequired: false});
        })));
  }

  public isAuthenticated(): boolean {
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

  public loadUserInfo(): Promise<UserInfo> {
    return firstValueFrom(this.http.get<UserInfo>('/users/info')
      .pipe(tap(userInfo => {
          this.userInfo = userInfo;
          return of(userInfo);
        }),
        /* eslint-disable @typescript-eslint/no-unused-vars */
        catchError(_ => {
          return of(null);
        })
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
}

interface UserInfo {
  username: string;
  permissions: string[];
}
