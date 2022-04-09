import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  constructor(
    private http: HttpClient
  ) { }

  // TODO simplify response in backend
  getCountries(): Observable<Country[]> {
    return this.http.get<CountryListResponse>('/countries').pipe(map(val => val.items));
  }
}

interface CountryListResponse {
  items: Country[]
}

export interface Country {
  code: string,
  name: string
}
