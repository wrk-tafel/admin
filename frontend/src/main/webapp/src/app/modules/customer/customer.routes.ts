import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, ResolveFn, Routes} from '@angular/router';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {CustomerDataResolver} from './resolver/customerdata-resolver.component';
import {CustomerNotesResolver} from './resolver/customernotes-resolver.component';
import {CustomerData, CustomerDuplicatesResponse} from '../../api/customer-api.service';
import {CustomerNotesResponse} from '../../api/customer-note-api.service';
import {CustomerDuplicatesComponent} from './views/customer-duplicates/customer-duplicates.component';
import {CustomerDuplicatesDataResolver} from './resolver/customer-duplicates-data-resolver.component';

export const customerDataResolver: ResolveFn<CustomerData> = (route: ActivatedRouteSnapshot) => {
  return inject(CustomerDataResolver).resolve(route);
};

export const customerNotesResolver: ResolveFn<CustomerNotesResponse> = (route: ActivatedRouteSnapshot) => {
  return inject(CustomerNotesResolver).resolve(route);
};

export const customerDuplicatesDataResolver: ResolveFn<CustomerDuplicatesResponse> = (route: ActivatedRouteSnapshot) => {
  return inject(CustomerDuplicatesDataResolver).resolve(route);
};

export const routes: Routes = [
  {
    path: 'anlegen',
    component: CustomerEditComponent
  },
  {
    path: 'detail/:id',
    component: CustomerDetailComponent,
    resolve: {
      customerData: customerDataResolver,
      customerNotes: customerNotesResolver,
    }
  },
  {
    path: 'bearbeiten/:id',
    component: CustomerEditComponent,
    resolve: {
      customerData: customerDataResolver
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
      customerDuplicatesData: customerDuplicatesDataResolver
    }
  },
];
