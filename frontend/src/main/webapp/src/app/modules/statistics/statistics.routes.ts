import {Routes} from '@angular/router';
import {StatisticsComponent} from './statistics.component';
import {StatisticsSettingsResolver} from './resolver/statistics-settings-resolver.component';

export const routes: Routes = [
  {
    path: '',
    component: StatisticsComponent,
    resolve: {
      settings: StatisticsSettingsResolver
    }
  },
];
