import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {StatisticsApiService, StatisticsSettings} from '../../../api/statistics-api.service';

@Injectable({
  providedIn: 'root'
})
export class StatisticsSettingsResolver {
  private statisticsApiService = inject(StatisticsApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<StatisticsSettings> {
    return this.statisticsApiService.getSettings();
  }

}
