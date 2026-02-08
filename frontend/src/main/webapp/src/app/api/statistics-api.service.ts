import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StatisticsApiService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<StatisticsSettings> {
    return this.http.get<StatisticsSettings>('/statistics/settings');
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
