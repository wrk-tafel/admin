import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerRoutingModule} from './customer-routing.module';
import {CustomerFormComponent} from './views/customer-form/customer-form.component';
import {CommonModule, NgIf} from '@angular/common';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {CustomerApiService} from '../../api/customer-api.service';
import {
  DropdownModule,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent, ModalModule, RoundedDirective, TabContentComponent, TabPaneComponent, TabsModule
} from '@coreui/angular';

@NgModule({
  imports: [
    DropdownModule,
    CommonModule,
    ReactiveFormsModule,
    CustomerRoutingModule,
    ModalModule,
    TabsModule,
    FormsModule,
    ModalBodyComponent,
    ModalComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    NgIf,
    RoundedDirective,
    TabContentComponent,
    TabPaneComponent
  ],
  declarations: [
    CustomerDetailComponent,
    CustomerEditComponent,
    CustomerFormComponent,
    CustomerSearchComponent
  ],
  providers: [
    CustomerApiService
  ]
})
export class CustomerModule {
}
