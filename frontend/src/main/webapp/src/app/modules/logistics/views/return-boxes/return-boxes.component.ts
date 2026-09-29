import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {
  ReturnBoxesApiService,
  ReturnBoxesList,
  ReturnBoxesRoute,
  ReturnBoxesShop
} from '../../../../api/return-boxes-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';

@Component({
  selector: 'tafel-return-boxes',
  templateUrl: 'return-boxes.component.html',
  imports: [DatePipe, MatButtonModule, MatCardModule]
})
export class ReturnBoxesComponent {
  private readonly api = inject(ReturnBoxesApiService);
  private readonly toastr = inject(TafelToastrService);

  readonly returnBoxes = signal<ReturnBoxesList>({routes: []});
  readonly loaded = signal(false);
  readonly saving = signal(false);

  readonly outstandingTotal = computed(() =>
    this.returnBoxes().routes
      .flatMap(route => route.shops)
      .flatMap(shop => shop.boxes)
      .filter(box => !box.returned)
      .reduce((sum, box) => sum + box.amount, 0)
  );

  constructor() {
    this.api.getReturnBoxes().subscribe({
      next: list => {
        this.returnBoxes.set(list);
        this.loaded.set(true);
      },
      error: error => this.toastr.error(extractErrorMessage(error), 'Fehler beim Laden der Retourkisten')
    });
  }

  routeTotal(route: ReturnBoxesRoute): number {
    return route.shops.reduce((sum, shop) => sum + this.outstandingAmount(shop), 0);
  }

  outstandingAmount(shop: ReturnBoxesShop): number {
    return shop.boxes.filter(box => !box.returned).reduce((sum, box) => sum + box.amount, 0);
  }

  hasOutstanding(shop: ReturnBoxesShop): boolean {
    return shop.boxes.some(box => !box.returned);
  }

  setReturned(route: ReturnBoxesRoute, shop: ReturnBoxesShop, returned: boolean) {
    this.saving.set(true);
    this.api.setReturned(route.routeId, shop.shopId, returned).subscribe({
      next: list => {
        this.returnBoxes.set(list);
        this.saving.set(false);
      },
      error: error => {
        this.saving.set(false);
        this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen');
      }
    });
  }
}
