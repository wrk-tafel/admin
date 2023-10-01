import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {

  constructor(
    private http: HttpClient
  ) {
  }

  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/users/change-password', request);
  }

  getUserForId(userId: number): Observable<UserData> {
    return this.http.get<UserData>('/users/' + userId);
  }

  getUserForPersonnelNumber(personnelNumber: string): Observable<UserData> {
    return this.http.get<UserSearchResult>('/users', {params: {personnelnumber: personnelNumber}})
      .pipe(map(searchResult => {
          if (searchResult.items.length > 0) {
            return searchResult.items[0];
          }
          return null;
        })
      );
  }

  searchUser(lastname?: string, firstname?: string): Observable<UserSearchResult> {
    let queryParams = new HttpParams();
    if (lastname) {
      queryParams = queryParams.set('lastname', lastname);
    }
    if (firstname) {
      queryParams = queryParams.set('firstname', firstname);
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
  permissions: string[];
}

export interface GeneratedPasswordResponse {
  password: string;
}
