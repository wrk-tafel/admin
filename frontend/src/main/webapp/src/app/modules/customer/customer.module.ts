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
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  DropdownModule, FormControlDirective, InputGroupComponent, InputGroupTextDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalModule,
  RoundedDirective,
  RowComponent,
  TabContentComponent,
  TableDirective,
  TabPaneComponent,
  TabsModule
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
    TabPaneComponent,
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    CardHeaderComponent,
    TableDirective,
    FormControlDirective,
    InputGroupComponent,
    InputGroupTextDirective
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
