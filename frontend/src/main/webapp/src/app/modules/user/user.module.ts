import {NgModule} from '@angular/core';
import {UserPasswordChangeComponent} from './user-passwordchange/user-passwordchange.component';
import {UserRoutingModule} from './user-routing.module';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent
} from '@coreui/angular';
import {TafelCommonModule} from '../../common/tafel-common.module';
import {CommonModule} from '@angular/common';

@NgModule({
  imports: [
    CommonModule,
    TafelCommonModule,
    UserRoutingModule,
    CardFooterComponent,
    CardHeaderComponent,
    CardComponent,
    CardBodyComponent,
    ButtonDirective
  ],
  declarations: [
    UserPasswordChangeComponent
  ]
})
export class UserModule {
}
