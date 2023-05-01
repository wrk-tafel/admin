import {inject, NgModule} from '@angular/core';
import {ActivatedRouteSnapshot, ResolveFn, RouterModule, Routes} from '@angular/router';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {CustomerDataResolver} from './resolver/customerdata-resolver.component';
import {CustomerNotesResolver} from './resolver/customernotes-resolver.component';
import {CustomerData} from '../../api/customer-api.service';
import {CustomerNoteItem} from '../../api/customer-note-api.service';

export const customerDataResolver: ResolveFn<CustomerData> = (route: ActivatedRouteSnapshot) => {
  return inject(CustomerDataResolver).resolve(route);
};

export const customerNotesResolver: ResolveFn<CustomerNoteItem[]> = (route: ActivatedRouteSnapshot) => {
  return inject(CustomerNotesResolver).resolve(route);
};

const routes: Routes = [
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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule {
}
