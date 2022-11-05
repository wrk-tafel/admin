import {NgModule} from '@angular/core';
import {EnrollmentRoutingModule} from './enrollment-routing.module';
import {ScannerComponent} from "./views/scanner/scanner.component";
import {ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    EnrollmentRoutingModule,
    ReactiveFormsModule,
    CommonModule
  ],
  declarations: [
    ScannerComponent
  ]
})
export class EnrollmentModule {
}
