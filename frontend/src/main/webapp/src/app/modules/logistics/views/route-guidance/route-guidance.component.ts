import {Component, computed, inject, model, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatSelectModule} from '@angular/material/select';
import {MatIcon} from '@angular/material/icon';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faBoxesStacked,
  faCheck,
  faChevronLeft,
  faDiamondTurnRight,
  faLocationDot,
  faNoteSticky,
  faPhone,
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
  + '"Erledigt & weiter" hakt den Stopp ab und zeigt den nächsten - für den heutigen Tag und auch auf '
  + 'anderen Geräten sichtbar. "Zurück" zeigt den vorherigen Stopp wieder an und macht das Abhaken '
  + 'dabei rückgängig.';

interface StopView {
  stop: RouteGuidanceStop;
  timeLabel: string;
  title: string;
  navigationUrl?: string;
  navigationLabel?: string;
  completedLabel?: string;
  isNext: boolean;
}

@Component({
  selector: 'tafel-route-guidance',
  templateUrl: 'route-guidance.component.html',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressBar,
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

  protected readonly completedPercent = computed(() => {
    const total = this.stops().length;
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  // one sentence for both the counter and the bar's accessible name, so the two cannot drift apart
  protected readonly progressLabel = computed(
    () => `${this.completedCount()} von ${this.stops().length} Stopps erledigt`
  );

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
  // list of fifteen stops is the wrong shape for that. Two buttons drive the whole screen, and they
  // carry the progress with them - see goForward/goBack.
  private readonly _currentIndex = signal(0);
  protected readonly currentIndex = this._currentIndex.asReadonly();
  protected readonly currentStop = computed<StopView | undefined>(() => this.stopViews()[this._currentIndex()]);
  protected readonly hasPreviousStop = computed(() => this._currentIndex() > 0);
  protected readonly hasNextStop = computed(() => this._currentIndex() < this.stops().length - 1);

  protected readonly forwardButtonText = computed(() => this.hasNextStop() ? 'Erledigt & weiter' : 'Erledigt');

  // the accessible name starts with the button's own visible text, so a screen reader user hears
  // the same label the sighted one reads
  protected readonly forwardButtonLabel = computed(() => {
    const view = this.currentStop();
    if (!view) {
      return undefined;
    }
    const stop = `Stopp ${view.timeLabel} ${view.title} als erledigt markieren`;
    return this.hasNextStop() ? `${stop} und zum nächsten Stopp` : stop;
  });

  protected readonly backButtonLabel = computed(() => {
    const previous = this.stopViews()[this._currentIndex() - 1];
    return previous
      ? `Zurück zu Stopp ${previous.timeLabel} ${previous.title} und wieder als offen markieren`
      : undefined;
  });

  // Forward on the last stop only ticks it off; once that is done there is nothing left to press.
  protected readonly forwardDisabled = computed(() =>
    this.pendingStopId() !== undefined || (!this.hasNextStop() && !!this.currentStop()?.stop.completed)
  );

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

  /**
   * Only set when the link does not reach the end of the route, and it says what is and is not
   * covered: "the map is short" would read as if the link were unusable, when in fact it takes the
   * driver through the next ten stops and only what comes after them has to be navigated singly.
   */
  protected readonly remainingRouteTruncatedHint = computed(() => {
    const overflow = this.remainingShopStops().length - MAX_MAP_STOPS;
    if (overflow <= 0) {
      return undefined;
    }

    const covered = `Die Karte führt über die nächsten ${MAX_MAP_STOPS} Stopps.`;
    return overflow === 1
      ? `${covered} Der Stopp danach ist einzeln zu navigieren.`
      : `${covered} Die ${overflow} Stopps danach sind einzeln zu navigieren.`;
  });

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
   * The whole screen is these two buttons, and moving is what records the progress - there is no
   * separate control to tick a stop off or take it back.
   *
   * Forward: the stop is done and the next one is up. On the last stop there is nowhere to move on
   * to, so it only ticks off. Back: the driver was not finished here after all, so the stop that
   * comes back on screen is open again.
   */
  protected goForward(stop: RouteGuidanceStop) {
    this.setCompletion(stop, true, true);
  }

  protected goBack() {
    const targetIndex = Math.max(0, this._currentIndex() - 1);
    this._currentIndex.set(targetIndex);

    const target = this.stops()[targetIndex];
    if (target?.completed) {
      this.setCompletion(target, false);
    }
  }

  private goToNextStop() {
    this._currentIndex.update(index => Math.min(this.stops().length - 1, index + 1));
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
      isNext
    };
  }

  private navigationUrl(shop: RouteGuidanceShop): string {
    return `${MAPS_DIRECTIONS_URL}&destination=${encodeURIComponent(shop.address)}&travelmode=driving`;
  }

  protected readonly faBoxesStacked = faBoxesStacked;
  protected readonly faCheck = faCheck;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faDiamondTurnRight = faDiamondTurnRight;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faNoteSticky = faNoteSticky;
  protected readonly faPhone = faPhone;
  protected readonly faRoute = faRoute;
  protected readonly faUser = faUser;
  protected readonly infoText = INFO_TEXT;
}
