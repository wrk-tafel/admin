import {Routes} from '@angular/router';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {StatisticsComponent} from './statistics.component';
import {StatisticsSettingsResolver} from './resolver/statistics-settings-resolver.component';

export const routes: Routes = [
  {
    path: '',
    component: StatisticsComponent,
    providers: [
      provideCharts(withDefaultRegisterables())
    ],
    resolve: {
      settings: StatisticsSettingsResolver
    }
  },
];
