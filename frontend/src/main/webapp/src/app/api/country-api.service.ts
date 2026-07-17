import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Service()
export class CountryApiService {
  private readonly http = inject(HttpClient);

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
