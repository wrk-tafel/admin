import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class StatisticsApiService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<StatisticsSettings> {
    return this.http.get<StatisticsSettings>('/statistics/settings');
  }

  getData(fromDate: Date, toDate: Date): Observable<StatisticsData> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('fromDate', moment(fromDate).format('YYYY-MM-DD'));
    queryParams = queryParams.set('toDate', moment(toDate).format('YYYY-MM-DD'));

    return this.http.get<StatisticsData>('/statistics/data', {params: queryParams});
  }

  generateCsv(fromDate: Date, toDate: Date): Observable<HttpResponse<Blob>> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('fromDate', moment(fromDate).format('YYYY-MM-DD'));
    queryParams = queryParams.set('toDate', moment(toDate).format('YYYY-MM-DD'));

    return this.http.get('/statistics/generate-csv',
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
  sheltersCount: StatisticsDetailData
  sheltersAverage: StatisticsDetailData
}

export interface StatisticsDetailData {
  title: string;
  subTitle: string;
  labels: string[];
  dataPoints: number[];
}
