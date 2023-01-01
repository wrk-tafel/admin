import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ScannerComponent} from './views/scanner/scanner.component';

const routes: Routes = [
  {
    path: 'scanner',
    component: ScannerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckinRoutingModule {
}
