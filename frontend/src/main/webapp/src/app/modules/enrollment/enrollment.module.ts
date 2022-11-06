import {NgModule} from '@angular/core';
import {EnrollmentRoutingModule} from './enrollment-routing.module';
import {ScannerComponent} from "./views/scanner/scanner.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    EnrollmentRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  declarations: [
    ScannerComponent
  ]
})
export class EnrollmentModule {
}
