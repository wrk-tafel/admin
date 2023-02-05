import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ScannerComponent} from './scanner/scanner.component';
import {CheckinComponent} from './checkin/checkin.component';

const routes: Routes = [
  {
    path: 'scanner',
    component: ScannerComponent
  },
  {
    path: 'annahme',
    component: CheckinComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckinRoutingModule {
}
