import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

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

  getUserForPersonnelNumber(personnelNumber: string): Observable<UserData> {
    return this.http.get<UserData>('/users', {params: {personnelnumber: personnelNumber}});
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
}
