import {Component, computed, DestroyRef, effect, inject, model, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
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
  faChevronRight,
  faDiamondTurnRight,
  faLocationDot,
  faNoteSticky,
  faPhone,
  faRoute,
  faRotateLeft,
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
import {ConnectivityService} from '../../../../common/connectivity/connectivity.service';
import {ScreenWakeLockService} from '../../../../common/wake-lock/screen-wake-lock.service';
import {RouteGuidanceOfflineQueueService} from '../../services/route-guidance-offline-queue.service';
import {buildSingleDestinationMapsUrl, MAPS_DIRECTIONS_URL} from '../../../../common/util/maps-url.util';

// Google's directions URL takes an origin, a destination and at most 9 waypoints, so a single link
// can cover 10 stops. Longer routes are opened in the map app in one chunk and the rest is driven
// stop by stop from the list.
const MAX_MAP_STOPS = 10;

// A device drives the same route with the same team most days - remembered per browser/device, not
// per user, so the picker opens on it again without anyone having to select it every morning.
const SELECTED_ROUTE_STORAGE_KEY = 'tafel.routeGuidance.selectedRouteId';


// What the screen would otherwise have to explain in a paragraph above the stop. It sits in a
// tooltip instead: on a phone in a van the stop itself has to be the first thing on the screen.
const INFO_TEXT =
  'Die Stopps einer Route, einer nach dem anderen in der Reihenfolge, in der sie angefahren werden. '
  + '"Zurück" und "Weiter" blättern frei zwischen den Stopps, ohne etwas abzuhaken. "Stopp erledigt" '
  + 'hakt den angezeigten Stopp ab, "Rückgängig machen" nimmt das wieder zurück - beides wirkt nur auf '
  + 'den gerade angezeigten Stopp. Ohne Verbindung werden Häkchen zwischengespeichert und automatisch '
  + 'übertragen, sobald wieder online.';

interface StopView {
  stop: RouteGuidanceStop;
  timeLabel: string;
  title: string;
  navigationUrl?: string;
  navigationLabel?: string;
  completedLabel?: string;
  isNext: boolean;
  // a completion tick for this stop is queued locally and not yet confirmed by the server - see
  // RouteGuidanceOfflineQueueService
  pending: boolean;
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
  private readonly connectivityService = inject(ConnectivityService);
  private readonly offlineQueueService = inject(RouteGuidanceOfflineQueueService);
  private readonly wakeLockService = inject(ScreenWakeLockService);
  private readonly window = inject(Window);
  private readonly destroyRef = inject(DestroyRef);

  protected selectedRoute?: RouteData;

  protected readonly isOnline = this.connectivityService.isOnline();
  protected readonly pendingSyncCount = this.offlineQueueService.pendingCount;

  private readonly _guidance = signal<RouteGuidanceData | undefined>(undefined);
  protected readonly guidance = this._guidance.asReadonly();
  // the stop whose request is still on its way (online only - an offline tick is applied locally
  // right away), so its buttons can't be pressed twice
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
    const routeId = this._guidance()?.routeId;
    return this.stops().map(stop => this.toStopView(stop, stop.stopId === nextStopId, routeId));
  });

  // Only one stop is on screen at a time: this is read at the wheel, on a phone, and a scrollable
  // list of fifteen stops is the wrong shape for that. "Zurück"/"Weiter" page freely between stops;
  // "Stopp erledigt"/"Rückgängig machen" act only on whichever stop is currently shown - the two are
  // deliberately independent, see setCompletion().
  private readonly _currentIndex = signal(0);
  protected readonly currentIndex = this._currentIndex.asReadonly();
  protected readonly currentStop = computed<StopView | undefined>(() => this.stopViews()[this._currentIndex()]);
  protected readonly hasPreviousStop = computed(() => this._currentIndex() > 0);
  protected readonly hasNextStop = computed(() => this._currentIndex() < this.stops().length - 1);

  protected readonly previousButtonLabel = computed(() => {
    const previous = this.stopViews()[this._currentIndex() - 1];
    return previous ? `Zurück zu Stopp ${previous.timeLabel} ${previous.title}` : undefined;
  });

  protected readonly nextButtonLabel = computed(() => {
    const next = this.stopViews()[this._currentIndex() + 1];
    return next ? `Weiter zu Stopp ${next.timeLabel} ${next.title}` : undefined;
  });

  // the accessible name starts with the button's own visible text, so a screen reader user hears
  // the same label the sighted one reads. Only set for the button the template actually renders for
  // the current stop's state (see `@if (view.stop.completed)` there) - the other stays undefined.
  protected readonly completeButtonLabel = computed(() => {
    const view = this.currentStop();
    return (view && !view.stop.completed) ? `Stopp ${view.timeLabel} ${view.title} als erledigt markieren` : undefined;
  });

  protected readonly undoButtonLabel = computed(() => {
    const view = this.currentStop();
    return (view && view.stop.completed) ? `Erledigung von Stopp ${view.timeLabel} ${view.title} rückgängig machen` : undefined;
  });

  protected readonly mutationDisabled = computed(() => this.pendingStopId() !== undefined);

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

  private hasRestoredRoute = false;

  // Fires once, as soon as routeList() actually has a value - it's a required model input, not
  // guaranteed to be readable yet at construction time (see the responsive food-collection screen's
  // loadEffect for the same reasoning). untracked() because restoring a route both reads and writes
  // signals this effect would otherwise also depend on.
  private readonly restoreRouteEffect = effect(() => {
    const list = this.routeList();
    if (list && !this.hasRestoredRoute) {
      this.hasRestoredRoute = true;
      untracked(() => this.restoreSelectedRoute(list));
    }
  });

  constructor() {
    // A queued completion is sent once connectivity returns; when it lands, the server-assigned
    // completedAt/completedBy replace the optimistic local guess set in setCompletion() below.
    this.offlineQueueService.stopSynced$.pipe(takeUntilDestroyed()).subscribe(
      ({routeId, stop}) => this.applyStopUpdate(routeId, stop)
    );

    this.window.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.window.document.removeEventListener('visibilitychange', this.onVisibilityChange);
      void this.wakeLockService.release();
    });
  }

  protected onSelectedRouteChange(route: RouteData | undefined) {
    this.selectedRoute = route;
    this._guidance.set(undefined);
    this.persistSelectedRouteId(route?.id);
    void this.wakeLockService.release();
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
        if (guidance.stops.length > 0) {
          // a cradled phone that locks between stops costs an unlock-and-navigate every time
          void this.wakeLockService.request();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Fehler beim Laden der Route');
      }
    });
  }

  /** Pure paging - never touches completion. See the class doc above `_currentIndex`. */
  protected goToPreviousStop() {
    this._currentIndex.update(index => Math.max(0, index - 1));
  }

  protected goToNextStop() {
    this._currentIndex.update(index => Math.min(this.stops().length - 1, index + 1));
  }

  /** Jumps straight to a stop, e.g. from the overview row of dots above the stop card. */
  protected goToStop(index: number) {
    if (index >= 0 && index < this.stops().length) {
      this._currentIndex.set(index);
    }
  }

  protected stepperDotClasses(view: StopView, index: number): string {
    const base = 'h-3 w-3 shrink-0 rounded-full border-2 transition-colors';
    if (view.pending) {
      return `${base} bg-amber-400 border-amber-400`;
    }
    if (view.stop.completed) {
      return `${base} bg-green-600 border-green-600`;
    }
    return index === this._currentIndex()
      ? `${base} bg-white border-blue-600 ring-2 ring-blue-300`
      : `${base} bg-white border-slate-300`;
  }

  protected completeCurrentStop() {
    const view = this.currentStop();
    if (view) {
      this.setCompletion(view.stop, true);
    }
  }

  protected undoCurrentStop() {
    const view = this.currentStop();
    if (view) {
      this.setCompletion(view.stop, false);
    }
  }

  /**
   * Acts only on the given stop - never on "the stop paging would move to next", because paging no
   * longer mutates anything (see goToPreviousStop/goToNextStop). Online, the tick is applied only
   * once the server confirms it. Offline, it's applied to the screen right away and queued - a
   * driver in a loading dock with no signal must not be blocked from recording progress, so this
   * path is deliberately optimistic; `stopSynced$` above corrects it with the real value once sent.
   */
  private setCompletion(stop: RouteGuidanceStop, completed: boolean) {
    const guidance = this._guidance();
    if (!guidance) {
      return;
    }

    if (!this.isOnline()) {
      this.applyStopUpdate(guidance.routeId, {...stop, completed, completedAt: undefined, completedBy: undefined});
      this.offlineQueueService.enqueue(guidance.routeId, stop.stopId, completed);
      return;
    }

    this.pendingStopId.set(stop.stopId);
    this.routeApiService.setStopCompletion(guidance.routeId, stop.stopId, completed).subscribe({
      next: updatedStop => {
        this.applyStopUpdate(guidance.routeId, updatedStop);
        this.pendingStopId.set(undefined);
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen');
        this.pendingStopId.set(undefined);
      }
    });
  }

  private applyStopUpdate(routeId: number, updatedStop: RouteGuidanceStop) {
    // the answer is folded into whatever is on screen now, not into the guidance this request
    // started from - a route picked while the request was out must not be overwritten by it
    const current = this._guidance();
    if (current?.routeId === routeId) {
      this._guidance.set({
        ...current,
        stops: current.stops.map(stop => stop.stopId === updatedStop.stopId ? updatedStop : stop)
      });
    }
  }

  private restoreSelectedRoute(list: RouteList) {
    const storedId = this.readStoredRouteId();
    if (storedId === undefined) {
      return;
    }
    const route = list.routes.find(candidate => candidate.id === storedId);
    if (route) {
      this.onSelectedRouteChange(route);
    }
  }

  private onVisibilityChange = () => {
    // the API only ever grants a lock for the visible tab - re-request once this tab is visible
    // again, e.g. after the screen was auto-locked or another app took the foreground
    if (this.window.document.visibilityState === 'visible' && this.stops().length > 0) {
      void this.wakeLockService.request();
    }
  };

  private persistSelectedRouteId(routeId: number | undefined) {
    try {
      if (routeId === undefined) {
        this.window.localStorage.removeItem(SELECTED_ROUTE_STORAGE_KEY);
      } else {
        this.window.localStorage.setItem(SELECTED_ROUTE_STORAGE_KEY, String(routeId));
      }
    } catch {
      // localStorage can throw (quota, private browsing) - the selection just won't be remembered
    }
  }

  private readStoredRouteId(): number | undefined {
    try {
      const raw = this.window.localStorage.getItem(SELECTED_ROUTE_STORAGE_KEY);
      return raw ? Number(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  private toStopView(stop: RouteGuidanceStop, isNext: boolean, routeId: number | undefined): StopView {
    // the backend serialises a LocalTime as "14:00:00" / a LocalDateTime as "2026-08-09T14:00:00"
    const timeLabel = stop.time.substring(0, 5);
    const title = stop.shop?.name ?? 'Stopp ohne Filiale';
    const completedTime = stop.completedAt?.substring(11, 16);
    const pending = routeId !== undefined && this.offlineQueueService.isPending(routeId, stop.stopId);

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
      completedLabel: pending
        ? 'Ausstehend - wird synchronisiert, sobald wieder online'
        : (stop.completed
          ? ['Erledigt', completedTime ? `um ${completedTime}` : undefined, stop.completedBy ? `von ${stop.completedBy}` : undefined]
            .filter(part => !!part)
            .join(' ')
          : undefined),
      isNext,
      pending
    };
  }

  private navigationUrl(shop: RouteGuidanceShop): string {
    return buildSingleDestinationMapsUrl(shop.address);
  }

  protected readonly faBoxesStacked = faBoxesStacked;
  protected readonly faCheck = faCheck;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faDiamondTurnRight = faDiamondTurnRight;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faNoteSticky = faNoteSticky;
  protected readonly faPhone = faPhone;
  protected readonly faRoute = faRoute;
  protected readonly faRotateLeft = faRotateLeft;
  protected readonly faUser = faUser;
  protected readonly infoText = INFO_TEXT;
}
