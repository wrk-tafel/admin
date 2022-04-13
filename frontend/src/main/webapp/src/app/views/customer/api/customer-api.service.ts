import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

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

  getCustomer(customerId: number): Observable<CustomerData> {
    return this.http.get<CustomerData>('/customers/' + customerId);
  }
}

export interface ValidateCustomerResponse {
  valid: boolean,
  totalSum: number,
  limit: number,
  toleranceValue: number,
  amountExceededLimit: number
}

export interface CustomerData {
  id?: number,
  customerId?: number,
  firstname: string,
  lastname: string,
  birthDate: Date,
  country: string,
  address: CustomerAddressData,
  telephoneNumber: number,
  email: string,
  employer: string,
  income: number,
  incomeDue: Date,
  additionalPersons: CustomerAddPersonData[]
}

export interface CustomerAddressData {
  street: string,
  houseNumber: string,
  stairway: string,
  door: string,
  postalCode: number,
  city: string
}

export interface CustomerAddPersonData {
  firstname: string,
  lastname: string,
  birthDate: Date,
  income: number
}
