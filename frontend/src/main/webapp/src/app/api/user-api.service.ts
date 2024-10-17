import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);

  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/users/change-password', request);
  }

  getUserForId(userId: number): Observable<UserData> {
    return this.http.get<UserData>('/users/' + userId);
  }

  getUserForPersonnelNumber(personnelNumber: string): Observable<UserData> {
    return this.http.get<UserData>('/users/personnel-number/' + personnelNumber);
  }

  searchUser(username?: string, enabled?: boolean, lastname?: string, firstname?: string, page?: number): Observable<UserSearchResult> {
    let queryParams = new HttpParams();
    if (username) {
      queryParams = queryParams.set('username', username);
    }
    if (enabled !== null) {
      queryParams = queryParams.set('enabled', enabled);
    }
    if (lastname) {
      queryParams = queryParams.set('lastname', lastname);
    }
    if (firstname) {
      queryParams = queryParams.set('firstname', firstname);
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<UserSearchResult>('/users', {params: queryParams});
  }

  updateUser(data: UserData): Observable<UserData> {
    return this.http.post<UserData>(`/users/${data.id}`, data);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`/users/${userId}`);
  }

  createUser(data: UserData): Observable<UserData> {
    return this.http.post<UserData>('/users', data);
  }

  generatePassword(): Observable<GeneratedPasswordResponse> {
    return this.http.get<GeneratedPasswordResponse>('/users/generate-password');
  }

  getPermissions(): Observable<PermissionsListResponse> {
    return this.http.get<PermissionsListResponse>('/users/permissions');
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

export interface UserSearchResult {
  items: UserData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
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
}

export interface PermissionsListResponse {
  permissions: UserPermission[];
}

export interface UserPermission {
  key: string;
  title: string;
}

export interface GeneratedPasswordResponse {
  password: string;
}
