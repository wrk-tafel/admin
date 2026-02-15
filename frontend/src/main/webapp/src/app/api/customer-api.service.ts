import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CountryData} from './country-api.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  private readonly http = inject(HttpClient);

  validate(data: CustomerData): Observable<ValidateCustomerResponse> {
    return this.http.post<ValidateCustomerResponse>('/customers/validate', data);
  }

  createCustomer(data: CustomerData): Observable<CustomerData> {
    return this.http.post<CustomerData>('/customers', data);
  }

  updateCustomer(data: CustomerData): Observable<CustomerData> {
    return this.http.post<CustomerData>(`/customers/${data.id}`, data);
  }

  deleteCustomer(customerId: number): Observable<void> {
    return this.http.delete<void>(`/customers/${customerId}`);
  }

  getCustomer(id: number): Observable<CustomerData> {
    return this.http.get<CustomerData>('/customers/' + id);
  }

  generatePdf(id: number, type: PdfType): Observable<HttpResponse<Blob>> {
    let queryParams = new HttpParams();
    queryParams = queryParams.append('type', type);

    return this.http.get('/customers/' + id + '/generate-pdf',
      {
        params: queryParams,
        responseType: 'blob',
        observe: 'response'
      });
  }

  searchCustomer(lastname?: string, firstname?: string, postProcessing?: boolean, costContribution?: boolean, page?: number): Observable<CustomerSearchResult> {
    let queryParams = new HttpParams();
    if (lastname) {
      queryParams = queryParams.set('lastname', lastname);
    }
    if (firstname) {
      queryParams = queryParams.set('firstname', firstname);
    }
    if (postProcessing) {
      queryParams = queryParams.set('postProcessing', postProcessing);
    }
    if (costContribution) {
      queryParams = queryParams.set('costContribution', costContribution);
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<CustomerSearchResult>('/customers', {params: queryParams});
  }

  getCustomerDuplicates(page?: number): Observable<CustomerDuplicatesResponse> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<CustomerDuplicatesResponse>('/customers/duplicates', {params: queryParams});
  }

  mergeCustomers(targetCustomerId: number, sourceCustomerIds: number[]): Observable<void> {
    const body: CustomerMergeRequest = {sourceCustomerIds: sourceCustomerIds};
    return this.http.post<void>(`/customers/${targetCustomerId}/merge`, body);
  }

}

export interface ValidateCustomerResponse {
  valid: boolean;
  totalSum: number;
  limit: number;
  toleranceValue: number;
  amountExceededLimit: number;
}

export interface CustomerSearchResult {
  items: CustomerData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface CustomerData {
  id?: number;
  issuer?: CustomerIssuer;
  issuedAt?: Date;
  firstname?: string;
  lastname?: string;
  birthDate?: Date;
  gender: Gender;
  country?: CountryData;
  address: CustomerAddressData;
  telephoneNumber?: string;
  email?: string;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  validUntil?: Date;
  locked?: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  lockReason?: string;
  pendingCostContribution?: number;
  additionalPersons?: CustomerAddPersonData[];
}

export interface CustomerIssuer {
  personnelNumber: string;
  firstname: string;
  lastname: string;
}

export interface CustomerAddressData {
  street?: string;
  houseNumber?: string;
  stairway?: string;
  door?: string;
  postalCode?: number;
  city?: string;
}

export interface CustomerAddPersonData {
  key: string | number;
  id: number;
  firstname: string;
  lastname: string;
  birthDate?: Date;
  gender?: Gender;
  country?: CountryData;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  excludeFromHousehold: boolean;
  receivesFamilyBonus: boolean;
}

export enum Gender {
  MALE = 'MALE', FEMALE = 'FEMALE'
}

export const GenderLabel: { [key in Gender]: string } = {
  [Gender.FEMALE]: 'Weiblich',
  [Gender.MALE]: 'Männlich'
};

type PdfType = 'MASTERDATA' | 'IDCARD' | 'COMBINED';

export interface CustomerDuplicatesResponse {
  items: CustomerDuplicatesItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface CustomerDuplicatesItem {
  customer: CustomerData;
  similarCustomers: CustomerData[];
}

export interface CustomerMergeRequest {
  sourceCustomerIds: number[];
}
