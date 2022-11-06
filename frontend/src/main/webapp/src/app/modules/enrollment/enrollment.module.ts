import {NgModule} from '@angular/core';
import {EnrollmentRoutingModule} from './enrollment-routing.module';
import {ScannerComponent} from "./views/scanner/scanner.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {CameraService} from "./views/scanner/camera/camera.service";
import {ScannerApiService} from "./api/scanner-api.service";

@NgModule({
  imports: [
    EnrollmentRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  declarations: [
    ScannerComponent
  ],
  providers: [
    CameraService,
    ScannerApiService
  ]
})
export class EnrollmentModule {
}
