import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import dayjs from 'dayjs';
import {PagedResponse} from '../common/api/paged-response';

@Service()
export class StatisticsApiService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<StatisticsSettings> {
    return this.http.get<StatisticsSettings>('/statistics/settings');
  }

  getData(fromDate: Date, toDate: Date): Observable<StatisticsData> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('fromDate', dayjs(fromDate).format('YYYY-MM-DD'));
    queryParams = queryParams.set('toDate', dayjs(toDate).format('YYYY-MM-DD'));

    return this.http.get<StatisticsData>('/statistics/data', {params: queryParams});
  }

  generateCsv(fromDate: Date, toDate: Date): Observable<HttpResponse<Blob>> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('fromDate', dayjs(fromDate).format('YYYY-MM-DD'));
    queryParams = queryParams.set('toDate', dayjs(toDate).format('YYYY-MM-DD'));

    return this.http.get('/statistics/generate-csv',
      {
        params: queryParams,
        responseType: 'blob',
        observe: 'response'
      });
  }

  getSchoolStarterPackageData(
    ageMin: number, ageMax: number, page?: number, pageSize?: number
  ): Observable<SchoolStarterPackageSearchResult> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('ageMin', ageMin);
    queryParams = queryParams.set('ageMax', ageMax);
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }

    return this.http.get<SchoolStarterPackageSearchResult>('/statistics/school-starter-package', {params: queryParams});
  }

  generateSchoolStarterPackageCsv(ageMin: number, ageMax: number): Observable<HttpResponse<Blob>> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('ageMin', ageMin);
    queryParams = queryParams.set('ageMax', ageMax);

    return this.http.get('/statistics/generate-school-starter-package-csv',
      {
        params: queryParams,
        responseType: 'blob',
        observe: 'response'
      });
  }

}

export interface StatisticsSettings {
  availableYears: number[];
  distributions: StatisticsDistribution[];
}

export interface StatisticsDistribution {
  startDate: Date;
  endDate: Date;
}

export interface StatisticsData {
  beneficiaryCustomers: StatisticsDetailData
  beneficiaryPersons: StatisticsDetailData
  beneficiaryCustomersWithChildren: StatisticsDetailData
  singleParentHouseholds: StatisticsDetailData
  sheltersCount: StatisticsDetailData
  sheltersAverage: StatisticsDetailData
  sheltersPersonsCount: StatisticsDetailData
  shopsCount: StatisticsDetailData
  shopItemsTotal: StatisticsDetailData
  shopItemsAverage: StatisticsDetailData
}

export interface StatisticsDetailData {
  title: string;
  subTitle: string;
  labels: string[];
  dataPoints: number[];
}

export interface SchoolStarterPackageEntry {
  householdId: number;
  firstname: string;
  lastname: string;
  age: number;
}

export type SchoolStarterPackageSearchResult = PagedResponse<SchoolStarterPackageEntry>;
