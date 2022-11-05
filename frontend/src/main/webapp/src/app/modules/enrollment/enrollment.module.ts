import {NgModule} from '@angular/core';
import {EnrollmentRoutingModule} from './enrollment-routing.module';
import {ScannerComponent} from "./views/scanner/scanner.component";

@NgModule({
  imports: [
    EnrollmentRoutingModule
  ],
  declarations: [
    ScannerComponent
  ]
})
export class EnrollmentModule {
}
