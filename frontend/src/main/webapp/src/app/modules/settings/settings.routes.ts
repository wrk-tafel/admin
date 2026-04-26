import {Routes} from '@angular/router';
import {SettingsEmailComponent} from './views/email/settings-email.component';
import {SettingsSheltersComponent} from './views/shelters/settings-shelters.component';

export const routes: Routes = [
  {
    path: 'email',
    component: SettingsEmailComponent,
  },
  {
    path: 'notschlafstellen',
    component: SettingsSheltersComponent,
  },
];
