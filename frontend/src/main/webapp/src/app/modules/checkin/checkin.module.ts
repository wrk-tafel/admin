import {NgModule} from '@angular/core';
import {CheckinRoutingModule} from './checkin-routing.module';
import {ScannerComponent} from './views/scanner/scanner.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {QRCodeReaderService} from './views/scanner/camera/qrcode-reader.service';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {ReceiptComponent} from './receipt/receipt.component';

@NgModule({
  imports: [
    CheckinRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  declarations: [
    ScannerComponent,
    ReceiptComponent
  ],
  providers: [
    QRCodeReaderService,
    WebsocketService
  ]
})
export class CheckinModule {
}
