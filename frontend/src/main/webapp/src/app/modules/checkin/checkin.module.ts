import {NgModule} from '@angular/core';
import {CheckinRoutingModule} from './checkin-routing.module';
import {ScannerComponent} from './scanner/scanner.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {QRCodeReaderService} from './qrcode-reader/qrcode-reader.service';
import {CheckinComponent} from './checkin/checkin.component';
import {CustomerApiService} from '../../api/customer-api.service';
import {ModalModule} from "ngx-bootstrap/modal";

@NgModule({
    imports: [
        CheckinRoutingModule,
        ReactiveFormsModule,
        CommonModule,
        FormsModule,
        ModalModule
    ],
  declarations: [
    ScannerComponent,
    CheckinComponent
  ],
  providers: [
    QRCodeReaderService,
    CustomerApiService
  ]
})
export class CheckinModule {
}
