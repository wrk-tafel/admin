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
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownModule,
  DropdownToggleDirective,
  FormCheckComponent,
  FormCheckInputDirective,
  FormControlDirective,
  FormLabelDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalModule,
  NavComponent,
  NavItemComponent,
  NavLinkDirective,
  RoundedDirective,
  RowComponent,
  TabContentComponent,
  TableDirective,
  TabPaneComponent,
  TabsModule
} from '@coreui/angular';
import {RouterLink} from '@angular/router';
import {IconDirective} from '@coreui/icons-angular';
import {TafelCommonModule} from '../../common/tafel-common.module';
import {CustomerDuplicatesComponent} from "./views/customer-duplicates/customer-duplicates.component";

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
    ButtonCloseDirective,
    BgColorDirective,
    FormCheckComponent,
    TafelCommonModule,
    FormCheckInputDirective,
    FormLabelDirective
  ],
  declarations: [
    CustomerDetailComponent,
    CustomerEditComponent,
    CustomerFormComponent,
    CustomerSearchComponent,
    CustomerDuplicatesComponent
  ],
  providers: [
    CustomerApiService
  ]
})
export class CustomerModule {
}
