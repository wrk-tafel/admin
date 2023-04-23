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
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent, CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownModule, DropdownToggleDirective,
  FormControlDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalModule, NavComponent, NavItemComponent, NavLinkDirective,
  RoundedDirective,
  RowComponent,
  TabContentComponent,
  TableDirective,
  TabPaneComponent,
  TabsModule
} from '@coreui/angular';
import {RouterLink} from "@angular/router";
import {IconDirective} from "@coreui/icons-angular";

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
    InputGroupTextDirective,
    ButtonDirective,
    ButtonDirective,
    DropdownComponent,
    DropdownDividerDirective,
    DropdownHeaderDirective,
    DropdownItemDirective,
    DropdownMenuDirective,
    DropdownToggleDirective,
    RouterLink,
    CardFooterComponent,
    NgIf,
    RoundedDirective,
    TabContentComponent,
    TabPaneComponent,
    IconDirective,
    NavComponent,
    NavItemComponent,
    NavLinkDirective,
    ButtonCloseDirective,
    ButtonCloseDirective
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
