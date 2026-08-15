import {Component, computed, effect, inject, signal, untracked} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton, MatIconButton} from '@angular/material/button';
import {
  faChevronDown,
  faChevronUp,
  faDiamondTurnRight,
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
import {
  EnabledFilter,
  matchesEnabledFilter
} from '../../../../common/components/tafel-enabled-filter/enabled-filter';
import {
  TafelEnabledFilterComponent
} from '../../../../common/components/tafel-enabled-filter/tafel-enabled-filter.component';
import {
  TafelEnabledToggleComponent
} from '../../../../common/components/tafel-enabled-toggle/tafel-enabled-toggle.component';
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
  /** the stops' share of searchIndex - a hit in here is invisible while the card is collapsed */
  stopsSearchIndex: string;
  /** undefined when the route has no stop with a resolved shop address to navigate to */
  mapsUrl?: string;
  /** only set when mapsUrl covers fewer stops than the route actually has */
  mapsUrlTruncatedHint?: string;
}

// Google's directions URL takes an origin, a destination and at most 9 waypoints, so a single link
// can cover 10 stops - same limit and reasoning as the Routen-Navi's own map link
// (route-guidance.component.ts), which this composes for a planner reviewing the saved route.
const MAX_MAP_STOPS = 10;

const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1';

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
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent,
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
    return this.routeViews()
      .filter(view => matchesEnabledFilter(view.route.enabled, filter) && (search.length === 0 || view.searchIndex.includes(search)))
      .sort((a, b) => a.route.number - b.route.number);
  });

  // Announced to a screen reader on every search/filter/sort change: the cards on screen change on
  // their own, which nothing else would tell an assistive-technology user (same reasoning as
  // employees'/audit's own role="status" search announcement).
  protected readonly searchAnnouncement = computed(
    () => `${this.visibleRoutes().length} von ${this.totalCount()} Routen`
  );

  constructor() {
    this.loadData();

    // a search term that hits a route only through its stops finds a shop the collapsed card
    // doesn't show, so such a route expands on its own to make the match visible; it never
    // auto-collapses - the summary toggle stays the way back
    effect(() => {
      const search = this.searchText().trim().toLowerCase();
      if (search.length === 0) {
        return;
      }
      const matchedByStops = this.routeViews()
        .filter(view => view.stopsSearchIndex.includes(search))
        .map(view => view.route.id);
      const expanded = new Set(untracked(this.expandedIds));
      matchedByStops.forEach(id => expanded.add(id));
      if (expanded.size !== untracked(this.expandedIds).size) {
        this.expandedIds.set(expanded);
      }
    });
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
      data: {route, shops: this.activeShops()},
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

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
  }

  protected clearSearch() {
    this.searchControl.setValue('');
  }

  private toRouteView(route: RouteData): RouteView {
    const stops = route.stops.map((stop, index) => this.toStopView(stop, index));
    const stopsSearchIndex = stops
      .map(stop => `${stop.label} ${stop.description ?? ''}`)
      .join(' ').toLowerCase();
    const searchIndex = `${[route.number, route.name, route.note].join(' ').toLowerCase()} ${stopsSearchIndex}`;

    // route.stops already arrives sorted by time (RouteService.mapRoute), so this is the exact
    // order the driver will follow - no re-sorting needed here, unlike the live edit dialog
    // preview, which sorts a still-being-edited FormArray.
    const {mapsUrl, mapsUrlTruncatedHint} = buildRouteMapsUrl(
      stops.filter(stop => !!stop.shopAddress).map(stop => stop.shopAddress as string)
    );

    return {
      route,
      stops,
      stopsSummary: buildStopsSummary(stops),
      searchIndex,
      stopsSearchIndex,
      mapsUrl,
      mapsUrlTruncatedHint
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
  protected readonly faDiamondTurnRight = faDiamondTurnRight;
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

/**
 * Composes the same kind of Google Maps directions link the Routen-Navi builds for its own
 * "restliche Route" link (route-guidance.component.ts) - here over the route's whole, already
 * time-sorted stop list, as the fastest sanity check a planner has for a stop order (#3240).
 */
function buildRouteMapsUrl(addresses: string[]): {mapsUrl?: string; mapsUrlTruncatedHint?: string} {
  if (addresses.length === 0) {
    return {};
  }

  const covered = addresses.slice(0, MAX_MAP_STOPS);
  const destination = encodeURIComponent(covered[covered.length - 1]);
  const waypoints = covered.slice(0, -1).map(address => encodeURIComponent(address));
  const waypointsParam = waypoints.length > 0 ? `&waypoints=${waypoints.join('%7C')}` : '';
  const mapsUrl = `${MAPS_DIRECTIONS_URL}&destination=${destination}${waypointsParam}&travelmode=driving`;

  const overflow = addresses.length - MAX_MAP_STOPS;
  if (overflow <= 0) {
    return {mapsUrl};
  }

  const coveredHint = `Die Karte deckt die ersten ${MAX_MAP_STOPS} Stopps ab.`;
  const mapsUrlTruncatedHint = overflow === 1
    ? `${coveredHint} Der Stopp danach ist einzeln zu navigieren.`
    : `${coveredHint} Die ${overflow} Stopps danach sind einzeln zu navigieren.`;

  return {mapsUrl, mapsUrlTruncatedHint};
}
