import {Component, computed, inject, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faEye, faEyeSlash, faMagnifyingGlass, faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {forkJoin} from 'rxjs';
import {RouteApiService, RouteData, RouteList} from '../../../../api/route-api.service';
import {ShopApiService, ShopItem} from '../../../../api/shop-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {RouteEditDialogComponent} from './dialogs/route-edit-dialog.component';
import {RouteDetailsDialogComponent} from './dialogs/route-details-dialog.component';

@Component({
  selector: 'tafel-settings-routes',
  templateUrl: 'settings-routes.component.html',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    FaIconComponent,
    MatButton
  ]
})
export class SettingsRoutesComponent {
  private readonly routeApiService = inject(RouteApiService);
  private readonly shopApiService = inject(ShopApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _routes = signal<RouteList | null>(null);
  private _shops = signal<ShopItem[]>([]);
  protected routes = this._routes;
  protected activeShops = computed(() => this._shops().filter(shop => shop.enabled));
  displayedColumns = ['active', 'number', 'name', 'stops', 'actions'];

  constructor() {
    this.loadData();
  }

  private loadData() {
    forkJoin({
      routes: this.routeApiService.getAllRoutes(),
      shops: this.shopApiService.getAllShops()
    }).subscribe({
      next: data => {
        this._routes.set(data.routes);
        this._shops.set(data.shops.shops);
      },
      error: () => this.toastr.error('Fehler beim Laden der Routen', 'Fehler')
    });
  }

  protected addRoute() {
    const dialogRef = this.dialog.open(RouteEditDialogComponent, {
      data: {route: undefined, shops: this.activeShops()},
      width: '800px'
    });

    dialogRef.afterClosed().subscribe((created: RouteData | undefined) => {
      if (created) {
        this.routeApiService.createRoute(created).subscribe({
          next: () => {
            this.toastr.success('Route erstellt', 'Erfolgreich');
            this.loadData();
          },
          // the backend's own message (e.g. two stops at the same time) is what the user needs here
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Erstellen fehlgeschlagen')
        });
      }
    });
  }

  protected editRoute(route: RouteData) {
    const dialogRef = this.dialog.open(RouteEditDialogComponent, {
      data: {route, shops: this.shopsForRoute(route)},
      width: '800px'
    });

    dialogRef.afterClosed().subscribe((updated: RouteData | undefined) => {
      if (updated) {
        this.routeApiService.updateRoute(route.id, updated).subscribe({
          next: () => {
            this.toastr.success('Route gespeichert', 'Erfolgreich');
            this.loadData();
          },
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen')
        });
      }
    });
  }

  protected toggleRouteVisibility(route: RouteData, enabled: boolean) {
    this.routeApiService.updateRoute(route.id, {...route, enabled}).subscribe({
      next: () => {
        this.toastr.success(`Route ${route.name} geändert`, 'Erfolgreich');
        this.loadData();
      },
      error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Fehler beim Ändern')
    });
  }

  protected viewRouteDetails(route: RouteData) {
    this.dialog.open(RouteDetailsDialogComponent, {
      data: {route, shops: this._shops()},
      width: '600px'
    });
  }

  // a disabled shop that a route already stops at stays selectable, so editing the route doesn't
  // silently drop that stop
  private shopsForRoute(route: RouteData): ShopItem[] {
    const usedShopIds = route.stops.map(stop => stop.shopId);
    return this._shops().filter(shop => shop.enabled || usedShopIds.includes(shop.id));
  }

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
}
