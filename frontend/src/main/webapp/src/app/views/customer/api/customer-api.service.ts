import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CountryData} from '../../../common/api/country-api.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  constructor(
    private http: HttpClient
  ) {
  }

  validate(data: CustomerData): Observable<ValidateCustomerResponse> {
    return this.http.post<ValidateCustomerResponse>('/customers/validate', data);
  }

  createCustomer(data: CustomerData): Observable<CustomerData> {
    return this.http.post<CustomerData>('/customers', data);
  }

  updateCustomer(data: CustomerData): Observable<any> {
    return this.http.post<CustomerData>(`/customers/${data.id}`, data);
  }

  getCustomer(id: number): Observable<CustomerData> {
    return this.http.get<CustomerData>('/customers/' + id);
  }

  generateMasterdataPdf(id: number): Observable<HttpResponse<ArrayBuffer>> {
    return this.http.get('/customers/' + id + '/generate-masterdata-pdf',
      {responseType: 'arraybuffer', observe: 'response'});
  }

  searchCustomer(lastname?: string, firstname?: string): Observable<CustomerSearchResult> {
    let queryParams = new HttpParams();
    if (lastname) {
      queryParams = queryParams.set('lastname', lastname);
    }
    if (firstname) {
      queryParams = queryParams.set('firstname', firstname);
    }
    return this.http.get<CustomerSearchResult>('/customers', {params: queryParams});
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
}

export interface CustomerData {
  id?: number;
  firstname: string;
  lastname: string;
  birthDate: Date;
  country?: CountryData;
  address: CustomerAddressData;
  telephoneNumber?: number;
  email?: string;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  additionalPersons?: CustomerAddPersonData[];
}

export interface CustomerAddressData {
  street: string;
  houseNumber: string;
  stairway?: string;
  door: string;
  postalCode: number;
  city: string;
}

export interface CustomerAddPersonData {
  key: number;
  id: number;
  firstname: string;
  lastname: string;
  birthDate: Date;
  income?: number;
}
