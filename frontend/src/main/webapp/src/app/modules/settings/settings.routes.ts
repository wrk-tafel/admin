import {Routes} from '@angular/router';
import {SettingsEmailComponent} from './views/email/settings-email.component';
import {SettingsSheltersComponent} from './views/shelters/settings-shelters.component';
import {SettingsStaticValuesComponent} from './views/static-values/settings-static-values.component';
import {SettingsFoodCategoriesComponent} from './views/food-categories/settings-food-categories.component';

export const routes: Routes = [
  {
    path: 'email',
    component: SettingsEmailComponent,
  },
  {
    path: 'notschlafstellen',
    component: SettingsSheltersComponent,
  },
  {
    path: 'statische-werte',
    component: SettingsStaticValuesComponent,
  },
  {
    path: 'lebensmittelkategorien',
    component: SettingsFoodCategoriesComponent,
  },
];
