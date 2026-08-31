import {Routes} from '@angular/router';
import {SettingsEmailComponent} from './views/email/settings-email.component';
import {SettingsSheltersComponent} from './views/shelters/settings-shelters.component';
import {SettingsStaticValuesComponent} from './views/static-values/settings-static-values.component';
import {SettingsFoodCategoriesComponent} from './views/food-categories/settings-food-categories.component';
import {
  SettingsFoodReturnCategoriesComponent
} from './views/food-return-categories/settings-food-return-categories.component';
import {SettingsCarsComponent} from './views/cars/settings-cars.component';
import {SettingsEmployeesComponent} from './views/employees/settings-employees.component';
import {SettingsRoutesComponent} from './views/routes/settings-routes.component';
import {SettingsShopsComponent} from './views/shops/settings-shops.component';
import {SettingsCountriesComponent} from './views/countries/settings-countries.component';

export const routes: Routes = [
  {
    path: 'email',
    title: 'E-Mail',
    component: SettingsEmailComponent,
  },
  {
    path: 'notschlafstellen',
    title: 'Notschlafstellen',
    component: SettingsSheltersComponent,
  },
  {
    path: 'statische-werte',
    title: 'Grenzwerte',
    component: SettingsStaticValuesComponent,
  },
  {
    path: 'lebensmittelkategorien',
    title: 'Waren-Kategorien',
    component: SettingsFoodCategoriesComponent,
  },
  {
    path: 'retourkategorien',
    title: 'Retour-Kategorien',
    component: SettingsFoodReturnCategoriesComponent,
  },
  {
    path: 'fahrzeuge',
    title: 'Fahrzeuge',
    component: SettingsCarsComponent,
  },
  {
    path: 'mitarbeiter',
    title: 'Mitarbeiter',
    component: SettingsEmployeesComponent,
  },
  {
    path: 'routen',
    title: 'Routen',
    component: SettingsRoutesComponent,
  },
  {
    path: 'filialen',
    title: 'Filialen',
    component: SettingsShopsComponent,
  },
  {
    path: 'laender',
    title: 'Länder',
    component: SettingsCountriesComponent,
  },
];
