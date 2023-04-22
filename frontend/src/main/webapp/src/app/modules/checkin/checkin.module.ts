import {NgModule} from '@angular/core';
import {CheckinRoutingModule} from './checkin-routing.module';
import {ScannerComponent} from './scanner/scanner.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {QRCodeReaderService} from './qrcode-reader/qrcode-reader.service';
import {CheckinComponent} from './checkin/checkin.component';
import {A11yModule} from '@angular/cdk/a11y';
import {
  BadgeComponent,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  FormSelectDirective,
  ModalModule,
  RowComponent
} from '@coreui/angular';

@NgModule({
  imports: [
    CheckinRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    ModalModule,
    A11yModule,
    FormSelectDirective,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    BadgeComponent
  ],
  declarations: [
    ScannerComponent,
    CheckinComponent
  ],
  providers: [
    QRCodeReaderService
  ]
})
export class CheckinModule {
}
