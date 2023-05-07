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
  BgColorDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  ContainerComponent,
  FormSelectDirective,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {TicketScreenComponent} from './ticket-screen/ticket-screen.component';
import {TicketScreenControlComponent} from './ticket-screen-control/ticket-screen-control.component';
import {TicketScreenFullscreenComponent} from './ticket-screen-fullscreen/ticket-screen-fullscreen.component';

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
    ContainerComponent,
    BgColorDirective
  ],
  declarations: [
    ScannerComponent,
    CheckinComponent,
    TicketScreenComponent,
    TicketScreenControlComponent,
    TicketScreenFullscreenComponent
  ],
  providers: [
    QRCodeReaderService
  ]
})
export class CheckinModule {
}
