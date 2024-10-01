import {Routes} from '@angular/router';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {CustomerDataResolver} from './resolver/customerdata-resolver.component';
import {CustomerNotesResolver} from './resolver/customernotes-resolver.component';
import {CustomerDuplicatesComponent} from './views/customer-duplicates/customer-duplicates.component';
import {CustomerDuplicatesDataResolver} from './resolver/customer-duplicates-data-resolver.component';

export const routes: Routes = [
  {
    path: 'anlegen',
    component: CustomerEditComponent
  },
  {
    path: 'detail/:id',
    component: CustomerDetailComponent,
    resolve: {
      customerData: CustomerDataResolver,
      customerNotesResponse: CustomerNotesResolver,
    }
  },
  {
    path: 'bearbeiten/:id',
    component: CustomerEditComponent,
    resolve: {
      customerData: CustomerDataResolver
    }
  },
  {
    path: 'suchen',
    component: CustomerSearchComponent
  },
  {
    path: 'duplikate',
    component: CustomerDuplicatesComponent,
    resolve: {
      customerDuplicatesData: CustomerDuplicatesDataResolver
    }
  },
];
