import { DecimalPipe } from "@angular/common";
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

  validate(data: CustomerRequestData): Observable<ValidateCustomerResponse> {
    return this.http.post<ValidateCustomerResponse>('/customers/validate', data);
  }

  createCustomer(data: CustomerRequestData): Observable<any> {
    return this.http.post('/customers', data);
  }
}

export interface ValidateCustomerResponse {
  valid: boolean,
  totalSum: number,
  limit: number,
  toleranceValue: number,
  amountExceededLimit: number
}

export interface CustomerRequestData {
  firstname: string,
  lastname: string,
  birthDate: Date,
  country: string,
  address: CustomerAddressRequestData,
  telephoneNumber: number,
  email: string,
  employer: string,
  income: number,
  incomeDue: Date,
  additionalPersons: CustomerAddPersonRequestData[]
}

export interface CustomerAddressRequestData {
  street: string,
  houseNumber: string,
  stairway: string,
  door: string,
  postalCode: number,
  city: string
}

export interface CustomerAddPersonRequestData {
  firstname: string,
  lastname: string,
  birthDate: Date,
  income: number
}
