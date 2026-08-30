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

  getChildrenData(
    filter: ChildrenFilter, page?: number, pageSize?: number, sortBy?: string, sortDirection?: string
  ): Observable<ChildrenSearchResult> {
    let queryParams = this.childrenParams(filter);
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    if (sortBy) {
      queryParams = queryParams.set('sortBy', sortBy);
    }
    if (sortDirection) {
      queryParams = queryParams.set('sortDirection', sortDirection);
    }

    return this.http.get<ChildrenSearchResult>('/statistics/children', {params: queryParams});
  }

  getChildrenAgeDistribution(
    filter: ChildrenFilter
  ): Observable<ChildrenAgeDistribution> {
    return this.http.get<ChildrenAgeDistribution>('/statistics/children/age-distribution',
      {params: this.childrenParams(filter)});
  }

  generateChildrenCsv(filter: ChildrenFilter): Observable<HttpResponse<Blob>> {
    return this.http.get('/statistics/generate-children-csv',
      {
        params: this.childrenParams(filter),
        responseType: 'blob',
        observe: 'response'
      });
  }

  private childrenParams(filter: ChildrenFilter): HttpParams {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('ageMin', filter.ageMin);
    queryParams = queryParams.set('ageMax', filter.ageMax);
    if (filter.referenceDate) {
      queryParams = queryParams.set('referenceDate', dayjs(filter.referenceDate).format('YYYY-MM-DD'));
    }

    return queryParams;
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

/**
 * One key figure: the headline as the backend formatted it (`title`) plus the plain number behind
 * it (`value`) and the unit it is measured in (`unit`, absent for a plain count). `value`/`unit`
 * are what a value computed here - the difference between two periods, the min/max of the course -
 * is derived and formatted from; `title` is only ever displayed as it arrives.
 */
export interface StatisticsDetailData {
  title: string;
  subTitle: string;
  value: number;
  unit?: string;
  labels: string[];
  dataPoints: number[];
}

/**
 * What the whole children report is measured against - the age range plus the
 * `referenceDate` the age is measured on ("Stichtag"). Passed as one object because all three
 * endpoints (list, per-age distribution, CSV export) have to be asked the exact same question,
 * or the headline count, the chart and the export would disagree with each other.
 */
export interface ChildrenFilter {
  ageMin: number;
  ageMax: number;
  referenceDate: Date;
}

export interface ChildEntry {
  householdId: number;
  firstname: string;
  lastname: string;
  age: number;
}

export type ChildrenSearchResult = PagedResponse<ChildEntry>;

export interface ChildrenAgeDistribution {
  items: ChildAgeCount[];
}

export interface ChildAgeCount {
  age: number;
  count: number;
}
