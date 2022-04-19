import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CountryApiService {
  constructor(
    private http: HttpClient
  ) { }

  getCountries(): Observable<CountryData[]> {
    return this.http.get<CountryListResponse>('/countries').pipe(map(val => val.items));
  }
}

interface CountryListResponse {
  items: CountryData[];
}

export interface CountryData {
  id: number;
  code: string;
  name: string;
}
