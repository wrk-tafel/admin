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
import {CustomerOverviewComponent} from './views/customer-overview/customer-overview.component';
import {CustomerOverviewDataResolver} from './resolver/customer-overview-data-resolver.component';
import {CustomerOverviewDistributionsResolver} from './resolver/customer-overview-distributions-resolver.component';
import {customerEditUnsavedChangesGuard} from './views/customer-edit/customer-edit-unsaved-changes.guard';

export const routes: Routes = [
  {
    path: 'anlegen',
    title: 'Kunden anlegen',
    component: CustomerEditComponent,
    canDeactivate: [customerEditUnsavedChangesGuard]
  },
  {
    path: 'detail/:id',
    title: 'Kunden-Details',
    component: CustomerDetailComponent,
    resolve: {
      customerData: CustomerDataResolver,
      customerNotesResponse: CustomerNotesResolver,
      customerDocumentsResponse: CustomerDocumentsResolver,
    }
  },
  {
    path: 'bearbeiten/:id',
    title: 'Kunden bearbeiten',
    component: CustomerEditComponent,
    resolve: {
      customerData: CustomerDataResolver
    },
    canDeactivate: [customerEditUnsavedChangesGuard]
  },
  {
    path: 'suchen',
    title: 'Kunden suchen',
    component: CustomerSearchComponent
  },
  {
    path: 'duplikate',
    title: 'Kunden-Duplikate',
    component: CustomerDuplicatesComponent,
    resolve: {
      customerDuplicatesData: CustomerDuplicatesDataResolver
    }
  },
  {
    path: 'ueber-limit',
    title: 'Kunden über Limit',
    component: CustomerAboveLimitComponent,
    resolve: {
      customerAboveLimitData: CustomerAboveLimitDataResolver
    }
  },
  {
    path: 'uebersicht',
    title: 'Kunden-Übersicht',
    component: CustomerOverviewComponent,
    resolve: {
      customerOverviewData: CustomerOverviewDataResolver,
      distributionsData: CustomerOverviewDistributionsResolver
    }
  },
  {
    path: 'zusammenfuehren/:id',
    title: 'Kunden zusammenführen',
    component: CustomerMergeComponent,
    resolve: {
      customerMergePreviewData: CustomerMergePreviewResolver
    }
  },
];
