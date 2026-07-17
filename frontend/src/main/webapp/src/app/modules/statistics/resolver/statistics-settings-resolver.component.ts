import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {StatisticsApiService, StatisticsSettings} from '../../../api/statistics-api.service';

@Service()
export class StatisticsSettingsResolver {
  private statisticsApiService = inject(StatisticsApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<StatisticsSettings> {
    return this.statisticsApiService.getSettings();
  }

}
