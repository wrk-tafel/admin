import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

@Service()
export class EmployeeApiService {
  private readonly http = inject(HttpClient);

  findEmployees(searchInput?: string, page?: number, pageSize?: number): Observable<EmployeeListResponse> {
    let queryParams = new HttpParams();
    if (searchInput) {
      queryParams = queryParams.set('searchInput', searchInput);
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<EmployeeListResponse>('/employees', {params: queryParams});
  }

  /**
   * Whether a personnel number is still free, and who holds it when it is not - asked while it is
   * being typed, so the collision is shown next to the field instead of as a failed save.
   * `excludedEmployeeId` is the employee being edited, whose own number is not a collision.
   */
  checkPersonnelNumberAvailability(personnelNumber: string, excludedEmployeeId?: number): Observable<PersonnelNumberAvailabilityResponse> {
    let queryParams = new HttpParams().set('personnelNumber', personnelNumber);
    if (excludedEmployeeId) {
      queryParams = queryParams.set('excludedEmployeeId', excludedEmployeeId);
    }
    return this.http.get<PersonnelNumberAvailabilityResponse>('/employees/personnel-number-availability', {params: queryParams});
  }

  saveEmployee(createEmployeeRequest: CreateEmployeeRequest): Observable<EmployeeData> {
    return this.http.post<EmployeeData>('/employees', createEmployeeRequest);
  }

  updateEmployee(employeeId: number, employeeRequest: CreateEmployeeRequest): Observable<EmployeeData> {
    return this.http.put<EmployeeData>(`/employees/${employeeId}`, employeeRequest);
  }

  deleteEmployee(employeeId: number): Observable<void> {
    return this.http.delete<void>(`/employees/${employeeId}`);
  }

  /**
   * The GDPR Art. 15/20 data takeout (issue #3394) for an employee with no linked user account, as
   * a PDF - the counterpart to `UserApiService.exportUserById` for someone who has no `userId` to
   * key an export off of.
   */
  exportEmployee(employeeId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`/employees/${employeeId}/export`, {responseType: 'blob', observe: 'response'});
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
  /** The user account referencing this employee, on the list responses that carry it. */
  userAccount?: EmployeeUserAccount;
}

export interface EmployeeUserAccount {
  id: number;
  username: string;
}

export interface PersonnelNumberAvailabilityResponse {
  available: boolean;
  existingEmployee?: EmployeeData;
}
