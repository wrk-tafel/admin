import {NgModule} from '@angular/core';
import {CheckinRoutingModule} from './checkin-routing.module';
import {ScannerComponent} from './scanner/scanner.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {QRCodeReaderService} from './qrcode-reader/qrcode-reader.service';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {CheckinComponent} from './checkin/checkin.component';
import {CustomerApiService} from '../../api/customer-api.service';
import {ScannerApiService} from "../../api/scanner-api.service";

@NgModule({
  imports: [
    CheckinRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  declarations: [
    ScannerComponent,
    CheckinComponent
  ],
  providers: [
    QRCodeReaderService,
    WebsocketService,
    CustomerApiService,
    ScannerApiService
  ]
})
export class CheckinModule {
}
