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

  createCustomer(data: CustomerRequestData) {
    // return this.http.get<CountryListResponse>('/countries').pipe(map(val => val.items));
    // TODO impl
    throw new Error('Method not implemented.');
  }
}

export interface ValidateCustomerResponse {
  valid: boolean
}

export interface CustomerRequestData {
  todo: string
}
