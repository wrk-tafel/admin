import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CountryData } from '../../../common/api/country-api.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  constructor(
    private http: HttpClient
  ) { }

  validate(data: CustomerData): Observable<ValidateCustomerResponse> {
    return this.http.post<ValidateCustomerResponse>('/customers/validate', data);
  }

  createCustomer(data: CustomerData): Observable<CustomerData> {
    return this.http.post<CustomerData>('/customers', data);
  }

  getCustomer(id: number): Observable<CustomerData> {
    return this.http.get<CustomerData>('/customers/' + id);
  }
}

export interface ValidateCustomerResponse {
  valid: boolean;
  totalSum: number;
  limit: number;
  toleranceValue: number;
  amountExceededLimit: number;
}

export interface CustomerData {
  id?: number;
  firstname: string;
  lastname: string;
  birthDate: Date;
  country: CountryData;
  address: CustomerAddressData;
  telephoneNumber: number;
  email: string;
  employer: string;
  income: number;
  incomeDue: Date;
  additionalPersons: CustomerAddPersonData[];
}

export interface CustomerAddressData {
  street: string;
  houseNumber: string;
  stairway: string;
  door: string;
  postalCode: number;
  city: string;
}

export interface CustomerAddPersonData {
  firstname: string;
  lastname: string;
  birthDate: Date;
  income?: number;
}
