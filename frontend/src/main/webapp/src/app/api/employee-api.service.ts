import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EmployeeApiService {
  private readonly http = inject(HttpClient);

  getEmployees(personnelNumber?: string): Observable<EmployeeData[]> {
    let queryParams = new HttpParams();
    if (personnelNumber) {
      queryParams = queryParams.set('personnelNumber', personnelNumber);
    }
    return this.http.get<EmployeeListResponse>('/employees', {params: queryParams}).pipe(map(val => val.items));
  }

  saveEmployee(createEmployeeRequest: CreateEmployeeRequest): Observable<EmployeeData> {
    return this.http.post<EmployeeData>('/employees', createEmployeeRequest);
  }

}

interface EmployeeListResponse {
  items: EmployeeData[];
}

export interface CreateEmployeeRequest {
  personnelNumber: string;
  firstname: string;
  lastname: string;
}

export interface EmployeeData {
  id: number;
  personnelNumber: string;
  firstname: string;
  lastname: string;
}
