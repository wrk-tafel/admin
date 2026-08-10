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
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';

// Google's directions URL takes an origin, a destination and at most 9 waypoints, so a single link
// can cover 10 stops. Longer routes are opened in the map app in one chunk and the rest is driven
// stop by stop from the list.
const MAX_MAP_STOPS = 10;

const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1';

// What the screen would otherwise have to explain in a paragraph above the stop. It sits in a
// tooltip instead: on a phone in a van the stop itself has to be the first thing on the screen.
const INFO_TEXT =
  'Die Stopps einer Route, einer nach dem anderen in der Reihenfolge, in der sie angefahren werden. '
  + '"Navigation starten" und "Erledigt & weiter" vermerken den Stopp als erledigt - für den heutigen '
  + 'Tag und auch auf anderen Geräten sichtbar. "Vorheriger" macht das für den Stopp, zu dem '
  + 'zurückgegangen wird, wieder rückgängig.';

interface StopView {
  stop: RouteGuidanceStop;
  timeLabel: string;
  title: string;
  navigationUrl?: string;
  navigationLabel?: string;
  completedLabel?: string;
  isNext: boolean;
  undoLabel?: string;
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
    FaIconComponent,
    TafelInfoTooltipComponent
  ]
})
export class RouteGuidanceComponent {
  routeList = model.required<RouteList>();

  private readonly routeApiService = inject(RouteApiService);
  private readonly toastr = inject(TafelToastrService);

  protected selectedRoute?: RouteData;

  private readonly _guidance = signal<RouteGuidanceData | undefined>(undefined);
  protected readonly guidance = this._guidance.asReadonly();
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

  /**
   * Paging back is a correction, not a look around: the stop it lands on is open again. A driver who
   * pressed "Erledigt & weiter" one stop too early takes it back the same way they moved on.
   */
  protected goToPreviousStop() {
    const targetIndex = Math.max(0, this._currentIndex() - 1);
    this._currentIndex.set(targetIndex);

    const target = this.stops()[targetIndex];
    if (target?.completed) {
      this.setCompletion(target, false);
    }
  }

  // Forward is plain paging - it must not tick anything off, or looking through a route before the
  // day starts (which this screen is reachable for) would finish it.
  protected goToNextStop() {
    this._currentIndex.update(index => Math.min(this.stops().length - 1, index + 1));
  }

  protected readonly doneButtonText = computed(() => this.hasNextStop() ? 'Erledigt & weiter' : 'Erledigt');

  // the accessible name starts with the button's own visible text, so a screen reader user hears
  // the same label the sighted one reads
  protected readonly doneButtonLabel = computed(() => {
    const view = this.currentStop();
    if (!view) {
      return undefined;
    }
    const stop = `Stopp ${view.timeLabel} ${view.title} als erledigt markieren`;
    return this.hasNextStop() ? `${stop} und zum nächsten Stopp` : stop;
  });

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

    this.routeApiService.getRouteGuidance(route.id).subscribe({
      next: guidance => {
        this._guidance.set(guidance);
        // open where the driver actually is - the first stop not done yet, or the last one when the
        // whole route is finished
        const firstOpenIndex = guidance.stops.findIndex(stop => !stop.completed);
        this._currentIndex.set(firstOpenIndex >= 0 ? firstOpenIndex : Math.max(0, guidance.stops.length - 1));
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Fehler beim Laden der Route');
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

  /**
   * The one button a driver presses at a stop: it ticks the stop off and moves on, so arriving at
   * the next one costs no second tap. The last stop has nowhere to move on to and only ticks off.
   */
  protected completeAndAdvance(stop: RouteGuidanceStop) {
    this.setCompletion(stop, true, true);
  }

  protected undoStop(stop: RouteGuidanceStop) {
    this.setCompletion(stop, false);
  }

  private setCompletion(stop: RouteGuidanceStop, completed: boolean, advanceOnSuccess = false) {
    const guidance = this._guidance();
    if (!guidance) {
      return;
    }

    this.pendingStopId.set(stop.stopId);
    this.routeApiService.setStopCompletion(guidance.routeId, stop.stopId, completed).subscribe({
      next: updatedStop => {
        // the answer is folded into whatever is on screen now, not into the guidance this request
        // started from - a route picked while the request was out must not be overwritten by it
        const current = this._guidance();
        if (current?.routeId === guidance.routeId) {
          this._guidance.set({
            ...current,
            stops: current.stops.map(stop => stop.stopId === updatedStop.stopId ? updatedStop : stop)
          });
          // only once the tick is stored - a driver must never be moved on past a stop the server
          // refused to record
          if (advanceOnSuccess) {
            this.goToNextStop();
          }
        }
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
      undoLabel: stop.completed
        ? `Rückgängig: Stopp ${timeLabel} ${title} wieder als offen markieren`
        : undefined
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
  protected readonly infoText = INFO_TEXT;
}
