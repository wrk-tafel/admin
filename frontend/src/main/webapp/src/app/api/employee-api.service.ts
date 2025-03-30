import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeApiService {
  private readonly http = inject(HttpClient);

  findEmployees(searchInput?: string, page?: number): Observable<EmployeeListResponse> {
    let queryParams = new HttpParams();
    if (searchInput) {
      queryParams = queryParams.set('searchInput', searchInput);
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<EmployeeListResponse>('/employees', {params: queryParams});
  }

  saveEmployee(createEmployeeRequest: CreateEmployeeRequest): Observable<EmployeeData> {
    return this.http.post<EmployeeData>('/employees', createEmployeeRequest);
  }

}

export interface EmployeeListResponse {
  items: EmployeeData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
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
