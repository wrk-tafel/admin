import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
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

describe('RouteGuidanceComponent', () => {
  const testRoute: RouteData = {id: 2, number: 2, name: 'Route 2', enabled: true, stops: []};
  const routeList: RouteList = {routes: [testRoute]};

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
      foodUnit: 'BOX',
      enabled: true
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
      foodUnit: 'KG',
      enabled: true
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

  beforeEach(() => {
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

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: RouteApiService, useValue: routeApiMock},
        {provide: TafelToastrService, useValue: toastrMock}
      ]
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(RouteGuidanceComponent);
    fixture.componentRef.setInput('routeList', routeList);
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

  it('builds a stop view with the labels the template renders', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    const [firstStop, secondStop] = component['stopViews']();
    expect(firstStop.timeLabel).toBe('12:00');
    expect(firstStop.title).toBe('Lidl');
    expect(firstStop.navigationUrl)
      .toBe('https://www.google.com/maps/dir/?api=1&destination=Hauptstra%C3%9Fe%205%2C%201010%20Wien&travelmode=driving');
    expect(firstStop.undoLabel).toBeUndefined();
    expect(secondStop.title).toBe('Stopp ohne Filiale');
    expect(secondStop.navigationUrl).toBeUndefined();
  });

  it('names the done button after what pressing it does', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['doneButtonText']()).toBe('Erledigt & weiter');
    expect(component['doneButtonLabel']()).toBe('Stopp 12:00 Lidl als erledigt markieren und zum nächsten Stopp');

    // the last stop has nowhere to move on to
    component['goToNextStop']();
    component['goToNextStop']();
    expect(component['doneButtonText']()).toBe('Erledigt');
    expect(component['doneButtonLabel']()).toBe('Stopp 13:00 Denns BioMarkt als erledigt markieren');
  });

  it('builds a directions link over the stops that are still open', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['remainingRouteUrl']()).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Nebengasse%202%2C%201020%20Wien' +
      '&waypoints=Hauptstra%C3%9Fe%205%2C%201010%20Wien&travelmode=driving'
    );
    expect(component['remainingRouteTruncated']()).toBe(false);
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
        foodUnit: 'BOX',
        enabled: true
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
    expect(component['remainingRouteTruncated']()).toBe(true);
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

  it('pages between the stops without running past either end', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['currentIndex']()).toBe(0);
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

  it('marks a stop as done when the navigation is started', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['onNavigationStarted'](component['stops']()[0]);
    fixture.detectChanges();

    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, true);
    expect(component['stopViews']()[0].stop.completed).toBe(true);
  });

  it('does not re-send a stop that navigation already marked as done', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true}, pauseStop, secondShopStop]
    }));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['onNavigationStarted'](component['stops']()[0]);

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

  it('ticks a stop off, keeps the answer from the backend and moves on', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['completeAndAdvance'](component['stops']()[0]);
    fixture.detectChanges();

    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, true);
    const [firstStopView] = component['stopViews']();
    expect(firstStopView.stop.completed).toBe(true);
    expect(firstStopView.completedLabel).toBe('Erledigt um 08:15 von E2E Test');
    expect(component['completedCount']()).toBe(1);
    expect(component['pendingStopId']()).toBeUndefined();
    expect(component['currentIndex']()).toBe(1);
  });

  it('stays on the last stop when it is ticked off', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);
    component['goToNextStop']();
    component['goToNextStop']();

    component['completeAndAdvance'](component['stops']()[2]);

    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 220, true);
    expect(component['currentIndex']()).toBe(2);
  });

  it('does not move on when the tick could not be stored', () => {
    routeApiMock.setStopCompletion = vi.fn(() => throwError(() => new Error('failed')));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['completeAndAdvance'](component['stops']()[0]);

    expect(component['currentIndex']()).toBe(0);
  });

  it('re-opens the stop it pages back to', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true}, pauseStop, secondShopStop]
    }));
    routeApiMock.setStopCompletion = vi.fn(() => of<RouteGuidanceStop>({...shopStop, completed: false}));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);
    expect(component['currentIndex']()).toBe(1);

    component['goToPreviousStop']();
    fixture.detectChanges();

    expect(component['currentIndex']()).toBe(0);
    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, false);
    expect(component['stopViews']()[0].stop.completed).toBe(false);
  });

  it('leaves an open stop alone when paging back to it', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);
    component['goToNextStop']();

    component['goToPreviousStop']();

    expect(component['currentIndex']()).toBe(0);
    expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
  });

  it('undoes a completed stop', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true, completedBy: 'E2E Test'}, pauseStop, secondShopStop]
    }));
    routeApiMock.setStopCompletion = vi.fn(() => of<RouteGuidanceStop>({...shopStop, completed: false}));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['undoStop'](component['stops']()[0]);
    fixture.detectChanges();

    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, false);
    expect(component['stopViews']()[0].stop.completed).toBe(false);
    expect(component['stopViews']()[0].completedLabel).toBeUndefined();
  });

  it('drops a stop answer that arrives after another route was picked', () => {
    const pendingCompletion = new Subject<RouteGuidanceStop>();
    routeApiMock.setStopCompletion = vi.fn(() => pendingCompletion.asObservable());
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['undoStop'](component['stops']()[0]);
    // the driver picks a different route while the tick is still on its way
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      routeId: 3,
      routeName: 'Route 3',
      stops: [secondShopStop]
    }));
    component['onSelectedRouteChange']({...testRoute, id: 3, name: 'Route 3'});
    pendingCompletion.next({...shopStop, completed: true});

    expect(component['guidance']()!.routeId).toBe(3);
    expect(component['stops']().length).toBe(1);
  });

  it('shows a toast when a stop cannot be saved', () => {
    routeApiMock.setStopCompletion = vi.fn(() => throwError(() => new Error('failed')));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['undoStop'](component['stops']()[0]);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(component['stopViews']()[0].stop.completed).toBe(false);
    expect(component['pendingStopId']()).toBeUndefined();
  });
});
