import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ScannerComponent} from './views/scanner/scanner.component';
import {EnrollmentComponent} from './views/enrollment/enrollment.component';

const routes: Routes = [
  {
    path: 'scanner',
    component: ScannerComponent
  },
  {
    path: 'kontrolle',
    component: EnrollmentComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckinRoutingModule {
}
