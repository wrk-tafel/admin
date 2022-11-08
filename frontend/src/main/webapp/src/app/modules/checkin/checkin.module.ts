import {NgModule} from '@angular/core';
import {CheckinRoutingModule} from './checkin-routing.module';
import {ScannerComponent} from "./views/scanner/scanner.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {QRCodeReaderService} from "./views/scanner/camera/qrcode-reader.service";
import {ScannerApiService} from "./api/scanner-api.service";

@NgModule({
  imports: [
    CheckinRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  declarations: [
    ScannerComponent
  ],
  providers: [
    QRCodeReaderService,
    ScannerApiService
  ]
})
export class CheckinModule {
}
