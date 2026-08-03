import {Routes} from '@angular/router';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {CustomerDataResolver} from './resolver/customerdata-resolver.component';
import {CustomerNotesResolver} from './resolver/customernotes-resolver.component';
import {CustomerDocumentsResolver} from './resolver/customerdocuments-resolver.component';
import {CustomerDuplicatesComponent} from './views/customer-duplicates/customer-duplicates.component';
import {CustomerDuplicatesDataResolver} from './resolver/customer-duplicates-data-resolver.component';
import {CustomerAboveLimitComponent} from './views/customer-above-limit/customer-above-limit.component';
import {CustomerAboveLimitDataResolver} from './resolver/customer-above-limit-data-resolver.component';
import {CustomerMergeComponent} from './views/customer-merge/customer-merge.component';
import {CustomerMergePreviewResolver} from './resolver/customer-merge-preview-resolver.component';

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
      customerDocumentsResponse: CustomerDocumentsResolver,
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
  {
    path: 'ueber-limit',
    component: CustomerAboveLimitComponent,
    resolve: {
      customerAboveLimitData: CustomerAboveLimitDataResolver
    }
  },
  {
    path: 'zusammenfuehren/:id',
    component: CustomerMergeComponent,
    resolve: {
      customerMergePreviewData: CustomerMergePreviewResolver
    }
  },
];
