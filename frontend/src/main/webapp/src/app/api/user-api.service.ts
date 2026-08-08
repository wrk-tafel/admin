import {HttpClient, HttpContext, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

@Service()
export class UserApiService {
  private readonly http = inject(HttpClient);

  changePassword(request: ChangePasswordRequest, context?: HttpContext): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/users/change-password', request, {context});
  }

  getUserForId(userId: number): Observable<UserData> {
    return this.http.get<UserData>('/users/' + userId);
  }

  getUserForPersonnelNumber(personnelNumber: string, context?: HttpContext): Observable<UserData> {
    return this.http.get<UserData>('/users/personnel-number/' + personnelNumber, {context});
  }

  searchUser(
    searchInput?: string | null,
    enabled?: boolean | null,
    page?: number,
    pageSize?: number
  ): Observable<UserSearchResult> {
    let queryParams = new HttpParams();
    if (searchInput) {
      queryParams = queryParams.set('searchInput', searchInput);
    }
    if (enabled !== null) {
      queryParams = queryParams.set('enabled', enabled ?? '');
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<UserSearchResult>('/users', {params: queryParams});
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

  getLoginAttempts(page?: number, pageSize?: number): Observable<PagedResponse<LoginAttemptItem>> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<PagedResponse<LoginAttemptItem>>('/users/login-attempts', {params: queryParams});
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
}
