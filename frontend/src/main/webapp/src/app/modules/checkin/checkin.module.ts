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
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {TicketScreenComponent} from './ticket-screen/ticket-screen.component';
import {TicketScreenControlComponent} from './ticket-screen-control/ticket-screen-control.component';
import {TicketScreenWindowComponent} from './ticket-screen-window/ticket-screen-window.component';
import {PortalModule} from '@angular/cdk/portal';

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
    BadgeComponent,
    CardHeaderComponent,
    CardFooterComponent,
    ButtonDirective,
    PortalModule
  ],
  declarations: [
    ScannerComponent,
    CheckinComponent,
    TicketScreenComponent,
    TicketScreenControlComponent,
    TicketScreenWindowComponent
  ],
  providers: [
    QRCodeReaderService
  ]
})
export class CheckinModule {
}
