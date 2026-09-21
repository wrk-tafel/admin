import {HttpClient, HttpContext, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

/** `SYSTEM` follows the operating system's light/dark setting. */
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

@Service()
export class UserApiService {
  private readonly http = inject(HttpClient);

  changePassword(request: ChangePasswordRequest, context?: HttpContext): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/users/change-password', request, {context});
  }

  /** Saves the caller's own light/dark preference; it comes back with the user info on the next login. */
  updateTheme(theme: ThemePreference): Observable<{ theme: ThemePreference }> {
    return this.http.put<{ theme: ThemePreference }>('/users/theme', {theme});
  }

  getUserForId(userId: number): Observable<UserData> {
    return this.http.get<UserData>('/users/' + userId);
  }

  /** The GDPR Art. 15/20 data takeout for the caller's own account (issue #3363), as a ZIP (PDF plus a machine-readable JSON file). */
  exportUser(): Observable<HttpResponse<Blob>> {
    return this.http.get('/users/export', {responseType: 'blob', observe: 'response'});
  }

  /** The same takeout as {@link exportUser}, admin-triggered for someone else's account. */
  exportUserById(userId: number): Observable<HttpResponse<Blob>> {
    return this.http.get('/users/' + userId + '/export', {responseType: 'blob', observe: 'response'});
  }

  /**
   * The Art. 13 GDPR privacy notice for staff (issue #3429) - what data is processed about a staff
   * member and why, not the Art. 15/20 takeout {@link exportUser} already answers. Generic, no
   * account reference needed.
   */
  generatePrivacyNoticeTemplate(): Observable<HttpResponse<Blob>> {
    return this.http.get('/users/privacy-notice-template', {responseType: 'blob', observe: 'response'});
  }

  getUserForPersonnelNumber(personnelNumber: string, context?: HttpContext): Observable<UserData> {
    return this.http.get<UserData>('/users/personnel-number/' + personnelNumber, {context});
  }

  /**
   * Sent as a `POST /users/search` body rather than `?searchInput=...` query parameters - a search
   * term is, in practice, a person's name, and a query string ends up in the never-rotated
   * access.log, the browser's history and support-mail context (GDPR gap G25, issue #3506/#3703).
   */
  searchUser(
    searchInput?: string | null,
    enabled?: boolean | null,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    sortDirection?: string
  ): Observable<UserSearchResult> {
    const body: UserSearchRequest = {
      searchInput: searchInput || undefined,
      enabled: enabled ?? undefined,
      page,
      pageSize,
      sortBy,
      sortDirection
    };
    return this.http.post<UserSearchResult>('/users/search', body);
  }

  updateUser(data: UserData, context?: HttpContext): Observable<UserData> {
    return this.http.put<UserData>(`/users/${data.id}`, data, {context});
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`/users/${userId}`);
  }

  createUser(data: UserData, context?: HttpContext): Observable<UserData> {
    return this.http.post<UserData>('/users', data, {context});
  }

  generatePassword(): Observable<GeneratedPasswordResponse> {
    return this.http.get<GeneratedPasswordResponse>('/users/generate-password');
  }

  getPermissions(): Observable<PermissionsListResponse> {
    return this.http.get<PermissionsListResponse>('/users/permissions');
  }

  /**
   * Sent as a `POST /users/login-attempts/search` body rather than `?searchInput=...` query
   * parameters - same reasoning as {@link searchUser}.
   */
  getLoginAttempts(
    page?: number,
    pageSize?: number,
    searchInput?: string | null,
    lockedOnly?: boolean,
    sortBy?: string,
    sortDirection?: string
  ): Observable<PagedResponse<LoginAttemptItem>> {
    const body: LoginAttemptSearchRequest = {
      searchInput: searchInput || undefined,
      lockedOnly: lockedOnly || undefined,
      page,
      pageSize,
      sortBy,
      sortDirection
    };
    return this.http.post<PagedResponse<LoginAttemptItem>>('/users/login-attempts/search', body);
  }

  getLoginAttemptSettings(): Observable<LoginAttemptSettingsResponse> {
    return this.http.get<LoginAttemptSettingsResponse>('/users/login-attempts/settings');
  }

  deleteLoginAttempt(loginAttemptId: number): Observable<void> {
    return this.http.delete<void>(`/users/login-attempts/${loginAttemptId}`);
  }

}

export interface ChangePasswordRequest {
  passwordCurrent: string;
  passwordNew: string;
}

export interface ChangePasswordResponse {
  message: string;
  details: string[];
}

export type UserSearchResult = PagedResponse<UserData>;

interface UserSearchRequest {
  searchInput?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

interface LoginAttemptSearchRequest {
  searchInput?: string;
  lockedOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface UserData {
  id?: number;
  personnelNumber: string;
  username: string;
  firstname: string;
  lastname: string;
  enabled: boolean;
  password?: string;
  passwordRepeat?: string;
  passwordChangeRequired: boolean;
  permissions: UserPermission[];
  // Currently active lockout from failed logins, server-computed; absent/null once it expired or
  // none is on record - see LoginAttemptService on the backend.
  lockedUntil?: string | null;
}

export interface PermissionsListResponse {
  permissions: UserPermission[];
}

export interface UserPermission {
  key: string;
  title: string;
  category: string;
}

export interface GeneratedPasswordResponse {
  password: string;
}

export interface LoginAttemptItem {
  id: number;
  username: string;
  failureCount: number;
  lastFailureAt: string;
  lockedUntil: string | null;
  /** The account behind the username, if one exists - a failed login names no account by itself. */
  userId: number | null;
}

export interface LoginAttemptSettingsResponse {
  maxFailures: number;
  lockoutDurationInSeconds: number;
}
