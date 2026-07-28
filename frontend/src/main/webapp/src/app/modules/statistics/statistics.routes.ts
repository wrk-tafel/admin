import {Routes} from '@angular/router';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {StatisticsGeneralComponent} from './views/general/statistics-general.component';
import {StatisticsMiscComponent} from './views/misc/statistics-misc.component';
import {StatisticsSettingsResolver} from './resolver/statistics-settings-resolver.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'allgemein',
    pathMatch: 'full'
  },
  {
    path: 'allgemein',
    component: StatisticsGeneralComponent,
    providers: [
      provideCharts(withDefaultRegisterables())
    ],
    resolve: {
      settings: StatisticsSettingsResolver
    }
  },
  {
    path: 'sonstige',
    component: StatisticsMiscComponent,
  },
];
