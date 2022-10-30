import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class UserApiService {

  constructor(
    private http: HttpClient
  ) {
  }

  updatePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/users/change-password', request);
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
