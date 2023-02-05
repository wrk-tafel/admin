import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ScannerComponent} from './scanner/scanner.component';
import {ReceiptComponent} from './receipt/receipt.component';

const routes: Routes = [
  {
    path: 'scanner',
    component: ScannerComponent
  },
  {
    path: 'annahme',
    component: ReceiptComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckinRoutingModule {
}
