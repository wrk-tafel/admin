import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {signal} from '@angular/core';
import {of, Subject, throwError} from 'rxjs';
import {RouteGuidanceComponent} from './route-guidance.component';
import {
  RouteApiService,
  RouteData,
  RouteGuidanceData,
  RouteGuidanceStop,
  RouteList
} from '../../../../api/route-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {ConnectivityService} from '../../../../common/connectivity/connectivity.service';
import {ScreenWakeLockService} from '../../../../common/wake-lock/screen-wake-lock.service';
import {RouteGuidanceOfflineQueueService} from '../../services/route-guidance-offline-queue.service';

const STORAGE_KEY = 'tafel.routeGuidance.selectedRouteId';

describe('RouteGuidanceComponent', () => {
  const testRoute: RouteData = {id: 2, number: 2, name: 'Route 2', enabled: true, stops: []};
  const otherRoute: RouteData = {id: 3, number: 3, name: 'Route 3', enabled: true, stops: []};
  const routeList: RouteList = {routes: [testRoute, otherRoute]};

  const shopStop: RouteGuidanceStop = {
    stopId: 200,
    time: '12:00:00',
    shop: {
      id: 20,
      number: 2000,
      name: 'Lidl',
      address: 'Hauptstraße 5, 1010 Wien',
      phone: '01 234567',
      contactPerson: 'Frau Huber',
      foodUnit: 'BOX'
    },
    completed: false,
    returnItems: [{shopName: 'Lidl', description: 'Graue Kisten', amount: 4}]
  };
  const pauseStop: RouteGuidanceStop = {
    stopId: 210,
    time: '12:30:00',
    description: 'Extra stop at home',
    completed: false,
    returnItems: []
  };
  const secondShopStop: RouteGuidanceStop = {
    stopId: 220,
    time: '13:00:00',
    shop: {
      id: 21,
      number: 2100,
      name: 'Denns BioMarkt',
      address: 'Nebengasse 2, 1020 Wien',
      foodUnit: 'KG'
    },
    completed: false,
    returnItems: []
  };

  const guidance: RouteGuidanceData = {
    routeId: 2,
    routeNumber: 2,
    routeName: 'Route 2',
    date: '2026-08-09',
    returnItemsFrom: '2026-08-02',
    stops: [shopStop, pauseStop, secondShopStop],
    unassignedReturnItems: [{shopName: 'Hofer Alt', description: 'Klappkisten schwarz', amount: 5}]
  };

  let routeApiMock: Partial<RouteApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let onlineSignal: ReturnType<typeof signal<boolean>>;
  let storedRouteId: string | null;
  let windowMock: {
    localStorage: {getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn>};
    document: {addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>; visibilityState: string};
  };
  let wakeLockMock: {request: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn>};
  let offlineQueueMock: {
    enqueue: ReturnType<typeof vi.fn>;
    isPending: ReturnType<typeof vi.fn>;
    pendingCount: ReturnType<typeof signal<number>>;
    stopSynced$: Subject<{routeId: number; stop: RouteGuidanceStop}>;
  };

  beforeEach(() => {
    onlineSignal = signal(true);
    storedRouteId = null;

    routeApiMock = {
      getRouteGuidance: vi.fn(() => of<RouteGuidanceData>(guidance)),
      setStopCompletion: vi.fn(() => of<RouteGuidanceStop>({
        ...shopStop,
        completed: true,
        completedAt: '2026-08-09T08:15:00',
        completedBy: 'E2E Test'
      }))
    };
    toastrMock = {success: vi.fn(), error: vi.fn()};

    const pendingKeys = new Set<string>();
    const pendingCountSignal = signal(0);
    offlineQueueMock = {
      enqueue: vi.fn((routeId: number, stopId: number) => {
        pendingKeys.add(`${routeId}:${stopId}`);
        pendingCountSignal.set(pendingKeys.size);
      }),
      isPending: vi.fn((routeId: number, stopId: number) => pendingKeys.has(`${routeId}:${stopId}`)),
      pendingCount: pendingCountSignal,
      stopSynced$: new Subject<{routeId: number; stop: RouteGuidanceStop}>()
    };

    wakeLockMock = {request: vi.fn().mockResolvedValue(undefined), release: vi.fn().mockResolvedValue(undefined)};

    windowMock = {
      localStorage: {
        getItem: vi.fn((key: string) => key === STORAGE_KEY ? storedRouteId : null),
        setItem: vi.fn((key: string, value: string) => {
          if (key === STORAGE_KEY) {
            storedRouteId = value;
          }
        }),
        removeItem: vi.fn((key: string) => {
          if (key === STORAGE_KEY) {
            storedRouteId = null;
          }
        })
      },
      document: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        visibilityState: 'visible'
      }
    };

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: RouteApiService, useValue: routeApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: ConnectivityService, useValue: {isOnline: () => onlineSignal.asReadonly()}},
        {provide: RouteGuidanceOfflineQueueService, useValue: offlineQueueMock},
        {provide: ScreenWakeLockService, useValue: wakeLockMock},
        {provide: Window, useValue: windowMock}
      ]
    }).compileComponents();
  });

  function createComponent(list: RouteList = routeList) {
    const fixture = TestBed.createComponent(RouteGuidanceComponent);
    fixture.componentRef.setInput('routeList', list);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the guidance once a route is selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);
    fixture.detectChanges();

    expect(routeApiMock.getRouteGuidance).toHaveBeenCalledWith(2);
    expect(component['stops']().length).toBe(3);
    expect(component['completedCount']()).toBe(0);
  });

  it('switchMap discards a stale guidance response from a route switched away from', () => {
    const guidanceA$ = new Subject<RouteGuidanceData>();
    const guidanceB$ = new Subject<RouteGuidanceData>();
    routeApiMock.getRouteGuidance = vi.fn(
      (routeId: number) => (routeId === testRoute.id ? guidanceA$ : guidanceB$)
    );

    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);
    component['onSelectedRouteChange'](otherRoute);

    // otherRoute, selected second, responds first
    guidanceB$.next({...guidance, routeId: otherRoute.id});
    expect(component['guidance']()?.routeId).toBe(otherRoute.id);

    // testRoute's slower response arrives after - switchMap already unsubscribed it, so it must
    // not overwrite what otherRoute already applied
    guidanceA$.next({...guidance, routeId: testRoute.id});
    expect(component['guidance']()?.routeId).toBe(otherRoute.id);
  });

  it('clears the guidance when the selection is reset', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['onSelectedRouteChange'](undefined);
    fixture.detectChanges();

    expect(component['guidance']()).toBeUndefined();
    expect(routeApiMock.getRouteGuidance).toHaveBeenCalledTimes(1);
  });

  it('shows a toast when the guidance cannot be loaded', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => throwError(() => new Error('failed')));
    const fixture = createComponent();

    fixture.componentInstance['onSelectedRouteChange'](testRoute);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(fixture.componentInstance['guidance']()).toBeUndefined();
  });

  it('marks the first open stop as the next one', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true}, pauseStop, secondShopStop]
    }));

    component['onSelectedRouteChange'](testRoute);
    fixture.detectChanges();

    const views = component['stopViews']();
    expect(views[0].isNext).toBe(false);
    expect(views[1].isNext).toBe(true);
    expect(views[2].isNext).toBe(false);
    expect(component['completedCount']()).toBe(1);
  });

  it('turns the counter into a percentage for the progress bar', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true}, pauseStop, secondShopStop]
    }));

    component['onSelectedRouteChange'](testRoute);
    fixture.detectChanges();

    expect(component['progressLabel']()).toBe('1 von 3 Stopps erledigt');
    expect(component['completedPercent']()).toBe(33);
  });

  it('reports no progress at all for a route without stops', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({...guidance, stops: []}));

    component['onSelectedRouteChange'](testRoute);
    fixture.detectChanges();

    expect(component['completedPercent']()).toBe(0);
  });

  it('builds a stop view with the labels the template renders', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    const [firstStop, secondStop] = component['stopViews']();
    expect(firstStop.timeLabel).toBe('12:00');
    expect(firstStop.title).toBe('Lidl');
    expect(firstStop.pending).toBe(false);
    expect(firstStop.navigationUrl)
      .toBe('https://www.google.com/maps/dir/?api=1&destination=Hauptstra%C3%9Fe%205%2C%201010%20Wien&travelmode=driving');
    expect(firstStop.navigationLabel).toContain('Navigation starten zu Lidl');
    expect(secondStop.title).toBe('Stopp ohne Filiale');
    expect(secondStop.navigationUrl).toBeUndefined();
  });

  it('names the buttons after what pressing them does', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['completeButtonLabel']()).toBe('Stopp 12:00 Lidl als erledigt markieren');
    // nothing behind the first stop
    expect(component['previousButtonLabel']()).toBeUndefined();
    expect(component['nextButtonLabel']()).toBe('Weiter zu Stopp 12:30 Stopp ohne Filiale');

    component['goToNextStop']();
    expect(component['previousButtonLabel']()).toBe('Zurück zu Stopp 12:00 Lidl');
    expect(component['undoButtonLabel']()).toBeUndefined(); // the pause stop is still open

    component['goToNextStop']();
    expect(component['nextButtonLabel']()).toBeUndefined(); // nothing beyond the last stop
  });

  it('builds a directions link over the stops that are still open', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['remainingRouteUrl']()).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Nebengasse%202%2C%201020%20Wien' +
      '&waypoints=Hauptstra%C3%9Fe%205%2C%201010%20Wien&travelmode=driving'
    );
    expect(component['remainingRouteTruncatedHint']()).toBeUndefined();
  });

  it('leaves out the directions link when every stop is done', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: guidance.stops.map(stop => ({...stop, completed: true}))
    }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);

    expect(component['remainingRouteUrl']()).toBeUndefined();
  });

  it('caps the directions link at ten stops and says so', () => {
    const manyStops: RouteGuidanceStop[] = Array.from({length: 12}, (_, index) => ({
      stopId: 300 + index,
      time: `1${index < 10 ? '0' : '1'}:00:00`,
      shop: {
        id: 300 + index,
        number: 3000 + index,
        name: `Shop ${index}`,
        address: `Gasse ${index}, 1010 Wien`,
        foodUnit: 'BOX'
      },
      completed: false,
      returnItems: []
    }));
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({...guidance, stops: manyStops}));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);

    const url = component['remainingRouteUrl']()!;
    expect(url).toContain('destination=Gasse%209%2C%201010%20Wien');
    expect(url.match(/%7C/g)?.length).toBe(8);
    expect(component['remainingRouteTruncatedHint']())
      .toBe('Die Karte führt über die nächsten 10 Stopps. Die 2 Stopps danach sind einzeln zu navigieren.');
  });

  it('shows one stop at a time and opens on the first one still to do', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true}, pauseStop, secondShopStop]
    }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);
    fixture.detectChanges();

    expect(component['currentIndex']()).toBe(1);
    expect(component['currentStop']()!.stop.stopId).toBe(210);
    expect(component['hasPreviousStop']()).toBe(true);
    expect(component['hasNextStop']()).toBe(true);
  });

  it('opens on the last stop when the whole route is done', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: guidance.stops.map(stop => ({...stop, completed: true}))
    }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);

    expect(component['currentIndex']()).toBe(2);
    expect(component['hasNextStop']()).toBe(false);
  });

  it('leaves the progress alone when the navigation is started', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    // the map link is a link and nothing else - only the completion button records progress
    expect(component['stopViews']()[0].navigationUrl).toBeDefined();
    expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
  });

  it('reports the return boxes the last trip left behind', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['returnItemsFrom']()).toBe('02.08.2026');
    // 4 at the first stop plus 5 with no stop on this route any more
    expect(component['returnItemsTotal']()).toBe(9);
    expect(component['unassignedReturnItems']()[0].shopName).toBe('Hofer Alt');
  });

  it('reports no return date when the last trip brought nothing back', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      returnItemsFrom: undefined,
      stops: guidance.stops.map(stop => ({...stop, returnItems: []})),
      unassignedReturnItems: []
    }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);

    expect(component['returnItemsFrom']()).toBeUndefined();
    expect(component['returnItemsTotal']()).toBe(0);
  });

  describe('browsing (decoupled from completion)', () => {
    it('pages between stops without touching completion', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      component['goToNextStop']();
      component['goToPreviousStop']();

      expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
      expect(offlineQueueMock.enqueue).not.toHaveBeenCalled();
    });

    it('does not run past either end while paging', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      expect(component['hasPreviousStop']()).toBe(false);
      component['goToPreviousStop']();
      expect(component['currentIndex']()).toBe(0);

      component['goToNextStop']();
      component['goToNextStop']();
      component['goToNextStop']();
      expect(component['currentIndex']()).toBe(2);
      expect(component['hasNextStop']()).toBe(false);
      expect(component['currentStop']()!.stop.stopId).toBe(220);
    });

    it('jumps straight to a stop via the overview', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      component['goToStop'](2);

      expect(component['currentIndex']()).toBe(2);
    });

    it('ignores an out-of-range jump', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      component['goToStop'](99);
      component['goToStop'](-1);

      expect(component['currentIndex']()).toBe(0);
    });

    it('re-reading a stop with "Zurück" leaves an already completed stop completed', () => {
      routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
        ...guidance,
        stops: [{...shopStop, completed: true, completedBy: 'E2E Test'}, pauseStop, secondShopStop]
      }));
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);
      expect(component['currentIndex']()).toBe(1);

      component['goToPreviousStop']();

      expect(component['currentIndex']()).toBe(0);
      expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
      expect(component['stopViews']()[0].stop.completed).toBe(true);
    });
  });

  describe('completion (online)', () => {
    it('completes the current stop and advances to the next one', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      component['completeCurrentStop']();
      fixture.detectChanges();

      expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, true);
      const [firstStopView] = component['stopViews']();
      expect(firstStopView.stop.completed).toBe(true);
      expect(firstStopView.completedLabel).toBe('Erledigt um 08:15 von E2E Test');
      expect(component['pendingStopId']()).toBeUndefined();
      expect(component['currentIndex']()).toBe(1);
    });

    it('stays on the last stop when completing it - there is nothing further to advance to', () => {
      routeApiMock.setStopCompletion = vi.fn(() => of<RouteGuidanceStop>({...secondShopStop, completed: true}));
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);
      component['goToStop'](2);

      component['completeCurrentStop']();
      fixture.detectChanges();

      expect(component['currentIndex']()).toBe(2);
    });

    it('undoes the current stop without moving the page', () => {
      routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
        ...guidance,
        stops: [{...shopStop, completed: true, completedBy: 'E2E Test'}, pauseStop, secondShopStop]
      }));
      routeApiMock.setStopCompletion = vi.fn(() => of<RouteGuidanceStop>({...shopStop, completed: false}));
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);
      component['goToPreviousStop']();
      expect(component['currentIndex']()).toBe(0);

      component['undoCurrentStop']();
      fixture.detectChanges();

      expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, false);
      expect(component['currentIndex']()).toBe(0);
      expect(component['stopViews']()[0].stop.completed).toBe(false);
      expect(component['stopViews']()[0].completedLabel).toBeUndefined();
    });

    it('shows a toast, leaves the stop untouched and does not advance when completion fails to save', () => {
      routeApiMock.setStopCompletion = vi.fn(() => throwError(() => new Error('failed')));
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      component['completeCurrentStop']();

      expect(toastrMock.error).toHaveBeenCalled();
      expect(component['stopViews']()[0].stop.completed).toBe(false);
      expect(component['pendingStopId']()).toBeUndefined();
      expect(component['currentIndex']()).toBe(0);
    });

    it('drops a stop answer that arrives after another route was picked, and does not page the new route either', () => {
      const pendingCompletion = new Subject<RouteGuidanceStop>();
      routeApiMock.setStopCompletion = vi.fn(() => pendingCompletion.asObservable());
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      component['completeCurrentStop']();
      // the driver picks a different route while the tick is still on its way - two stops, so a
      // wrongly-applied advance (the late answer paging the new route instead of being dropped)
      // would actually move the index and not just no-op on an already-last stop
      routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
        ...guidance,
        routeId: 3,
        routeName: 'Route 3',
        stops: [secondShopStop, pauseStop]
      }));
      component['onSelectedRouteChange']({...testRoute, id: 3, name: 'Route 3'});
      pendingCompletion.next({...shopStop, completed: true});

      expect(component['guidance']()!.routeId).toBe(3);
      expect(component['stops']().length).toBe(2);
      expect(component['currentIndex']()).toBe(0);
    });
  });

  describe('offline queue', () => {
    it('applies a completion locally, queues it while offline, and advances to the next stop', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);
      onlineSignal.set(false);

      component['completeCurrentStop']();
      fixture.detectChanges();

      expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
      expect(offlineQueueMock.enqueue).toHaveBeenCalledWith(2, 200, true);
      const [firstStopView] = component['stopViews']();
      expect(firstStopView.stop.completed).toBe(true);
      expect(firstStopView.pending).toBe(true);
      expect(firstStopView.completedLabel).toBe('Ausstehend - wird synchronisiert, sobald wieder online');
      expect(component['pendingSyncCount']()).toBe(1);
      expect(component['currentIndex']()).toBe(1);
    });

    it('queues an undo the same way while offline, without paging', () => {
      routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
        ...guidance,
        stops: [{...shopStop, completed: true, completedBy: 'E2E Test'}, pauseStop, secondShopStop]
      }));
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);
      component['goToPreviousStop']();
      onlineSignal.set(false);

      component['undoCurrentStop']();
      fixture.detectChanges();

      expect(offlineQueueMock.enqueue).toHaveBeenCalledWith(2, 200, false);
      expect(component['stopViews']()[0].stop.completed).toBe(false);
      expect(component['stopViews']()[0].pending).toBe(true);
      expect(component['currentIndex']()).toBe(0);
    });

    it('merges the synced stop once the offline queue confirms it', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      offlineQueueMock.stopSynced$.next({
        routeId: 2,
        stop: {...shopStop, completed: true, completedAt: '2026-08-09T08:20:00', completedBy: 'E2E Test'}
      });
      fixture.detectChanges();

      const [firstStopView] = component['stopViews']();
      expect(firstStopView.completedLabel).toBe('Erledigt um 08:20 von E2E Test');
    });

    it('ignores a synced stop for a route that is no longer selected', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component['onSelectedRouteChange'](testRoute);

      offlineQueueMock.stopSynced$.next({
        routeId: 99,
        stop: {...shopStop, completed: true, completedAt: '2026-08-09T08:20:00', completedBy: 'E2E Test'}
      });
      fixture.detectChanges();

      expect(component['stopViews']()[0].stop.completed).toBe(false);
    });
  });

  describe('remembering the selected route', () => {
    it('preselects the route remembered from a previous visit', () => {
      storedRouteId = '3';

      createComponent();

      expect(routeApiMock.getRouteGuidance).toHaveBeenCalledWith(3);
    });

    it('does not preselect a stored route that is no longer in the list', () => {
      storedRouteId = '999';

      createComponent();

      expect(routeApiMock.getRouteGuidance).not.toHaveBeenCalled();
    });

    it('remembers the newly selected route for next time', () => {
      const fixture = createComponent();

      fixture.componentInstance['onSelectedRouteChange'](testRoute);

      expect(windowMock.localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, '2');
    });

    it('forgets the remembered route once the selection is cleared', () => {
      const fixture = createComponent();
      fixture.componentInstance['onSelectedRouteChange'](testRoute);

      fixture.componentInstance['onSelectedRouteChange'](undefined);

      expect(windowMock.localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('screen wake lock', () => {
    it('keeps the screen awake once a route with stops is loaded', () => {
      const fixture = createComponent();

      fixture.componentInstance['onSelectedRouteChange'](testRoute);

      expect(wakeLockMock.request).toHaveBeenCalled();
    });

    it('does not request a wake lock for a route without stops', () => {
      routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({...guidance, stops: []}));
      const fixture = createComponent();

      fixture.componentInstance['onSelectedRouteChange'](testRoute);

      expect(wakeLockMock.request).not.toHaveBeenCalled();
    });

    it('releases the wake lock once the route is cleared', () => {
      const fixture = createComponent();
      fixture.componentInstance['onSelectedRouteChange'](testRoute);
      wakeLockMock.release.mockClear();

      fixture.componentInstance['onSelectedRouteChange'](undefined);

      expect(wakeLockMock.release).toHaveBeenCalled();
    });

    it('releases the wake lock when the component is destroyed', () => {
      const fixture = createComponent();
      fixture.componentInstance['onSelectedRouteChange'](testRoute);
      wakeLockMock.release.mockClear();

      fixture.destroy();

      expect(wakeLockMock.release).toHaveBeenCalled();
    });

    it('re-requests the wake lock once the tab becomes visible again', () => {
      const fixture = createComponent();
      fixture.componentInstance['onSelectedRouteChange'](testRoute);
      wakeLockMock.request.mockClear();

      const listenerCall = windowMock.document.addEventListener.mock.calls
        .find(([eventName]) => eventName === 'visibilitychange');
      expect(listenerCall).toBeDefined();
      windowMock.document.visibilityState = 'visible';
      listenerCall![1]();

      expect(wakeLockMock.request).toHaveBeenCalled();
    });
  });
});
