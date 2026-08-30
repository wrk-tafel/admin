import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Service()
export class CountryApiService {
  private readonly http = inject(HttpClient);

  getCountries(): Observable<CountryListResult> {
    return this.http.get<CountryListResponse>('/countries')
      .pipe(map(val => ({countries: val.items, frequentlyUsedCount: val.frequentlyUsedCount})));
  }

  getAllCountries(): Observable<CountryList> {
    return this.http.get<CountryList>('/countries/admin');
  }

  updateCountry(countryId: number, country: CountryAdminData): Observable<CountryAdminData> {
    return this.http.put<CountryAdminData>(`/countries/${countryId}`, country);
  }
}

interface CountryListResponse {
  items: CountryData[];
  frequentlyUsedCount: number;
}

/** How many leading `countries` are the "frequently used" group - where the nationality autocomplete puts its divider. */
export interface CountryListResult {
  countries: CountryData[];
  frequentlyUsedCount: number;
}

export interface CountryData {
  id: number;
  code: string;
  name: string;
}

export interface CountryList {
  items: CountryAdminData[];
}

export interface CountryAdminData {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
}
