import {Component, computed, inject, model, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatIcon} from '@angular/material/icon';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faBoxesStacked,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faDiamondTurnRight,
  faLocationDot,
  faNoteSticky,
  faPhone,
  faRotateLeft,
  faRoute,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import {
  RouteApiService,
  RouteData,
  RouteGuidanceData,
  RouteGuidanceShop,
  RouteGuidanceStop,
  RouteList
} from '../../../../api/route-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';

// Google's directions URL takes an origin, a destination and at most 9 waypoints, so a single link
// can cover 10 stops. Longer routes are opened in the map app in one chunk and the rest is driven
// stop by stop from the list.
const MAX_MAP_STOPS = 10;

const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1';

interface StopView {
  stop: RouteGuidanceStop;
  timeLabel: string;
  title: string;
  navigationUrl?: string;
  navigationLabel?: string;
  completedLabel?: string;
  isNext: boolean;
  toggleLabel: string;
}

@Component({
  selector: 'tafel-route-guidance',
  templateUrl: 'route-guidance.component.html',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIcon,
    FaIconComponent
  ]
})
export class RouteGuidanceComponent {
  routeList = model.required<RouteList>();

  private readonly routeApiService = inject(RouteApiService);
  private readonly toastr = inject(TafelToastrService);

  protected selectedRoute?: RouteData;

  private readonly _guidance = signal<RouteGuidanceData | undefined>(undefined);
  protected readonly guidance = this._guidance.asReadonly();
  protected readonly loading = signal(false);
  // the stop whose request is still on its way, so its button can't be pressed twice
  protected readonly pendingStopId = signal<number | undefined>(undefined);

  protected readonly stops = computed(() => this._guidance()?.stops ?? []);
  protected readonly completedCount = computed(() => this.stops().filter(stop => stop.completed).length);
  protected readonly unassignedReturnItems = computed(() => this._guidance()?.unassignedReturnItems ?? []);

  // the day the boxes now going back were collected, formatted the way the rest of the app writes a
  // date; undefined when the last trip brought nothing back
  protected readonly returnItemsFrom = computed(() => {
    const isoDate = this._guidance()?.returnItemsFrom;
    if (!isoDate) {
      return undefined;
    }
    const [year, month, day] = isoDate.split('-');
    return `${day}.${month}.${year}`;
  });

  protected readonly returnItemsTotal = computed(() =>
    [...this.stops().flatMap(stop => stop.returnItems), ...this.unassignedReturnItems()]
      .reduce((total, item) => total + item.amount, 0)
  );

  private readonly nextStopId = computed(() => this.stops().find(stop => !stop.completed)?.stopId);

  protected readonly stopViews = computed<StopView[]>(() => {
    const nextStopId = this.nextStopId();
    return this.stops().map(stop => this.toStopView(stop, stop.stopId === nextStopId));
  });

  // Only one stop is on screen at a time: this is read at the wheel, on a phone, and a scrollable
  // list of fifteen stops is the wrong shape for that. The driver pages through with the two
  // buttons below.
  private readonly _currentIndex = signal(0);
  protected readonly currentIndex = this._currentIndex.asReadonly();
  protected readonly currentStop = computed<StopView | undefined>(() => this.stopViews()[this._currentIndex()]);
  protected readonly hasPreviousStop = computed(() => this._currentIndex() > 0);
  protected readonly hasNextStop = computed(() => this._currentIndex() < this.stops().length - 1);

  protected goToPreviousStop() {
    this._currentIndex.update(index => Math.max(0, index - 1));
  }

  protected goToNextStop() {
    this._currentIndex.update(index => Math.min(this.stops().length - 1, index + 1));
  }

  // every stop still to be driven that has an address to navigate to
  private readonly remainingShopStops = computed(
    () => this.stops().filter(stop => !stop.completed && stop.shop).map(stop => stop.shop as RouteGuidanceShop)
  );

  protected readonly remainingRouteUrl = computed(() => {
    const addresses = this.remainingShopStops().slice(0, MAX_MAP_STOPS).map(shop => shop.address);
    if (addresses.length === 0) {
      return undefined;
    }

    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses.slice(0, -1).map(address => encodeURIComponent(address));
    const waypointsParam = waypoints.length > 0 ? `&waypoints=${waypoints.join('%7C')}` : '';
    return `${MAPS_DIRECTIONS_URL}&destination=${destination}${waypointsParam}&travelmode=driving`;
  });

  protected readonly remainingRouteTruncated = computed(() => this.remainingShopStops().length > MAX_MAP_STOPS);

  protected onSelectedRouteChange(route: RouteData | undefined) {
    this.selectedRoute = route;
    this._guidance.set(undefined);
    if (!route) {
      return;
    }

    this.loading.set(true);
    this.routeApiService.getRouteGuidance(route.id).subscribe({
      next: guidance => {
        this._guidance.set(guidance);
        // open where the driver actually is - the first stop not done yet, or the last one when the
        // whole route is finished
        const firstOpenIndex = guidance.stops.findIndex(stop => !stop.completed);
        this._currentIndex.set(firstOpenIndex >= 0 ? firstOpenIndex : Math.max(0, guidance.stops.length - 1));
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Fehler beim Laden der Route');
        this.loading.set(false);
      }
    });
  }

  /**
   * Starting the navigation is the confirmation - a driver who is on the way to a stop has dealt
   * with it, and asking for a second tap on a phone in a moving van is one tap too many. The link
   * opens the map app either way; only the marking is done here, and only once.
   */
  protected onNavigationStarted(stop: RouteGuidanceStop) {
    if (!stop.completed) {
      this.setCompletion(stop, true);
    }
  }

  protected toggleStop(stop: RouteGuidanceStop) {
    this.setCompletion(stop, !stop.completed);
  }

  private setCompletion(stop: RouteGuidanceStop, completed: boolean) {
    const guidance = this._guidance();
    if (!guidance) {
      return;
    }

    this.pendingStopId.set(stop.stopId);
    this.routeApiService.setStopCompletion(guidance.routeId, stop.stopId, completed).subscribe({
      next: updatedStop => {
        this._guidance.set({
          ...guidance,
          stops: guidance.stops.map(current => current.stopId === updatedStop.stopId ? updatedStop : current)
        });
        this.pendingStopId.set(undefined);
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen');
        this.pendingStopId.set(undefined);
      }
    });
  }

  private toStopView(stop: RouteGuidanceStop, isNext: boolean): StopView {
    // the backend serialises a LocalTime as "14:00:00" / a LocalDateTime as "2026-08-09T14:00:00"
    const timeLabel = stop.time.substring(0, 5);
    const title = stop.shop?.name ?? 'Stopp ohne Filiale';
    const completedTime = stop.completedAt?.substring(11, 16);

    return {
      stop,
      timeLabel,
      title,
      navigationUrl: stop.shop ? this.navigationUrl(stop.shop) : undefined,
      // the accessible name starts with the button's own visible text, so a screen reader user
      // hears the same label the sighted one reads, with the destination appended
      navigationLabel: stop.shop
        ? `Navigation starten zu ${stop.shop.name}, ${stop.shop.address} (in neuem Tab)`
        : undefined,
      completedLabel: stop.completed
        ? ['Erledigt', completedTime ? `um ${completedTime}` : undefined, stop.completedBy ? `von ${stop.completedBy}` : undefined]
          .filter(part => !!part)
          .join(' ')
        : undefined,
      isNext,
      toggleLabel: stop.completed
        ? `Rückgängig: Stopp ${timeLabel} ${title} wieder als offen markieren`
        : `Stopp ${timeLabel} ${title} als erledigt markieren`
    };
  }

  private navigationUrl(shop: RouteGuidanceShop): string {
    return `${MAPS_DIRECTIONS_URL}&destination=${encodeURIComponent(shop.address)}&travelmode=driving`;
  }

  protected readonly faBoxesStacked = faBoxesStacked;
  protected readonly faCheck = faCheck;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faDiamondTurnRight = faDiamondTurnRight;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faNoteSticky = faNoteSticky;
  protected readonly faPhone = faPhone;
  protected readonly faRotateLeft = faRotateLeft;
  protected readonly faRoute = faRoute;
  protected readonly faUser = faUser;
}
