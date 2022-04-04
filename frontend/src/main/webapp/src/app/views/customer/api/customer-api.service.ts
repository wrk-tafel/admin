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
    return this.http.get<CountryResponse>('/countries').pipe(map(val => val._embedded.countries));
  }
}

interface CountryResponse {
  _embedded: CountryEmbeddedResponse
}

interface CountryEmbeddedResponse {
  countries: Country[]
}

export interface Country {
  code: String,
  name: String
}
