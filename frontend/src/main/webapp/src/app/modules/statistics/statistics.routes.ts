import {Routes} from '@angular/router';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {StatisticsGeneralComponent} from './views/general/statistics-general.component';
import {
  StatisticsSchoolStarterPackagesComponent
} from './views/school-starter-packages/statistics-school-starter-packages.component';
import {StatisticsSettingsResolver} from './resolver/statistics-settings-resolver.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'allgemein',
    pathMatch: 'full'
  },
  {
    path: 'allgemein',
    title: 'Statistik - Allgemein',
    component: StatisticsGeneralComponent,
    providers: [
      provideCharts(withDefaultRegisterables())
    ],
    resolve: {
      settings: StatisticsSettingsResolver
    }
  },
  {
    path: 'schulstartpakete',
    title: 'Statistik - Schulstartpakete',
    component: StatisticsSchoolStarterPackagesComponent,
  },
];
