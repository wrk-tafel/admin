import {Component, computed, inject, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatSlideToggleChange, MatSlideToggleModule} from '@angular/material/slide-toggle';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton, MatIconButton} from '@angular/material/button';
import {
  faChevronDown,
  faChevronUp,
  faMagnifyingGlass,
  faNoteSticky,
  faPencil,
  faPlus,
  faRoute,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {forkJoin} from 'rxjs';
import {RouteApiService, RouteData, RouteStopData} from '../../../../api/route-api.service';
import {ShopApiService, ShopItem} from '../../../../api/shop-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {formatShopAddress} from '../../../../common/util/format-shop-address.util';
import {EnabledFilter, matchesEnabledFilter} from '../enabled-filter';
import {RouteEditDialogComponent} from './dialogs/route-edit-dialog.component';

interface RouteStopView {
  key: string;
  time: string;
  /** the shop, or - for a stop without one - its description, which is all that identifies it */
  label: string;
  shopAddress?: string;
  /** only set alongside a shop; for a stop without one the description already is the label */
  description?: string;
}

interface RouteView {
  route: RouteData;
  stops: RouteStopView[];
  stopsSummary: string;
  searchIndex: string;
}

@Component({
  selector: 'tafel-settings-routes',
  templateUrl: 'settings-routes.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    FaIconComponent,
    MatButton,
    MatIconButton
  ]
})
export class SettingsRoutesComponent {
  private readonly routeApiService = inject(RouteApiService);
  private readonly shopApiService = inject(ShopApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private readonly _routes = signal<RouteData[]>([]);
  private readonly _shops = signal<ShopItem[]>([]);
  private readonly _loaded = signal(false);
  // creating a route offers the shops as its stops, so the button has to wait for them - without
  // that, an early click opens the dialog with an empty shop list
  protected readonly loaded = this._loaded;

  protected readonly searchControl = new FormControl('', {nonNullable: true});
  private readonly searchText = toSignal(this.searchControl.valueChanges, {initialValue: ''});
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');

  protected readonly activeShops = computed(() => this._shops().filter(shop => shop.enabled));
  protected readonly totalCount = computed(() => this._routes().length);
  protected readonly enabledCount = computed(() => this._routes().filter(route => route.enabled).length);
  protected readonly filtered = computed(() => this.searchText().trim().length > 0 || this.enabledFilter() !== 'ALL');

  private readonly shopsById = computed(() => new Map(this._shops().map(shop => [shop.id, shop])));
  private readonly routeViews = computed(() => this._routes().map(route => this.toRouteView(route)));

  // which records are expanded, by route id rather than by index, so a search or a filter change
  // does not carry the expanded state over to whichever record now sits at that position
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());

  protected readonly visibleRoutes = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const filter = this.enabledFilter();
    return this.routeViews().filter(view =>
      matchesEnabledFilter(view.route.enabled, filter) && (search.length === 0 || view.searchIndex.includes(search))
    );
  });

  constructor() {
    this.loadData();
  }

  private loadData() {
    forkJoin({
      routes: this.routeApiService.getAllRoutes(),
      shops: this.shopApiService.getAllShops()
    }).subscribe({
      next: data => {
        this._routes.set(data.routes.routes);
        this._shops.set(data.shops.shops);
        this._loaded.set(true);
      },
      error: () => {
        this.toastr.error('Fehler beim Laden der Routen', 'Fehler');
        this._loaded.set(true);
      }
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

  protected onEnabledToggled(route: RouteData, event: MatSlideToggleChange) {
    this.setRouteEnabled(route, event.checked);
  }

  protected setRouteEnabled(route: RouteData, enabled: boolean) {
    this.routeApiService.updateRoute(route.id, {...route, enabled}).subscribe({
      next: () => {
        this.toastr.success(`Route ${route.name} geändert`, 'Erfolgreich');
        this.loadData();
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Fehler beim Ändern');
        // the toggle already moved on its own, so the list has to be re-read to undo it visually
        this.loadData();
      }
    });
  }

  protected isExpanded(routeId: number): boolean {
    return this.expandedIds().has(routeId);
  }

  protected toggleExpanded(routeId: number) {
    const expanded = new Set(this.expandedIds());
    if (!expanded.delete(routeId)) {
      expanded.add(routeId);
    }
    this.expandedIds.set(expanded);
  }

  protected onFilterChanged(event: MatButtonToggleChange) {
    this.enabledFilter.set(event.value as EnabledFilter);
  }

  protected clearSearch() {
    this.searchControl.setValue('');
  }

  // a disabled shop that a route already stops at stays selectable, so editing the route doesn't
  // silently drop that stop
  private shopsForRoute(route: RouteData): ShopItem[] {
    const usedShopIds = route.stops.map(stop => stop.shopId);
    return this._shops().filter(shop => shop.enabled || usedShopIds.includes(shop.id));
  }

  private toRouteView(route: RouteData): RouteView {
    const stops = route.stops.map((stop, index) => this.toStopView(stop, index));
    const searchIndex = [
      route.number,
      route.name,
      route.note,
      ...stops.map(stop => `${stop.label} ${stop.description ?? ''}`)
    ].join(' ').toLowerCase();

    return {
      route,
      stops,
      stopsSummary: buildStopsSummary(stops),
      searchIndex
    };
  }

  private toStopView(stop: RouteStopData, index: number): RouteStopView {
    const shop = stop.shopId != null ? this.shopsById().get(stop.shopId) : undefined;
    const description = stop.description?.trim() ? stop.description : undefined;
    return {
      key: stop.id != null ? `stop-${stop.id}` : `index-${index}`,
      time: formatStopTime(stop.time),
      label: shop ? `${shop.number} - ${shop.name}` : (description ?? ''),
      shopAddress: shop ? formatShopAddress(shop) : undefined,
      description: shop ? description : undefined
    };
  }

  protected readonly faPencil = faPencil;
  protected readonly faPlus = faPlus;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faXmark = faXmark;
  protected readonly faNoteSticky = faNoteSticky;
  protected readonly faRoute = faRoute;
  protected readonly faChevronDown = faChevronDown;
  protected readonly faChevronUp = faChevronUp;
}

// the backend sends a LocalTime ("14:00:00"), of which only hours and minutes are ever maintained
function formatStopTime(time: string): string {
  return time?.length >= 5 ? time.substring(0, 5) : time;
}

function buildStopsSummary(stops: RouteStopView[]): string {
  if (stops.length === 0) {
    return 'Keine Stopps';
  }
  if (stops.length === 1) {
    return `1 Stopp · ${stops[0].time}`;
  }
  return `${stops.length} Stopps · ${stops[0].time} – ${stops[stops.length - 1].time}`;
}
