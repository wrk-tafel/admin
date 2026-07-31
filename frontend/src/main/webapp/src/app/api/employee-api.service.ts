import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

@Service()
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

export type EmployeeListResponse = PagedResponse<EmployeeData>;

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
