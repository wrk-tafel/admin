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
    expect(firstStop.navigationLabel).toContain('Navigation starten zu Lidl');
    expect(secondStop.title).toBe('Stopp ohne Filiale');
    expect(secondStop.navigationUrl).toBeUndefined();
  });

  it('names the two buttons after what pressing them does', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['forwardButtonText']()).toBe('Erledigt & weiter');
    expect(component['forwardButtonLabel']()).toBe('Stopp 12:00 Lidl als erledigt markieren und zum nächsten Stopp');
    // nothing behind the first stop
    expect(component['backButtonLabel']()).toBeUndefined();

    component['goToNextStop']();
    expect(component['backButtonLabel']()).toBe('Zurück zu Stopp 12:00 Lidl und wieder als offen markieren');

    // the last stop has nowhere to move on to
    component['goToNextStop']();
    expect(component['forwardButtonText']()).toBe('Erledigt');
    expect(component['forwardButtonLabel']()).toBe('Stopp 13:00 Denns BioMarkt als erledigt markieren');
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

  it('does not run past either end of the route', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    expect(component['currentIndex']()).toBe(0);
    expect(component['hasPreviousStop']()).toBe(false);

    component['goBack']();
    expect(component['currentIndex']()).toBe(0);

    component['goToNextStop']();
    component['goToNextStop']();
    component['goToNextStop']();
    expect(component['currentIndex']()).toBe(2);
    expect(component['hasNextStop']()).toBe(false);
    expect(component['currentStop']()!.stop.stopId).toBe(220);
  });

  it('leaves the progress alone when the navigation is started', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    // the map link is a link and nothing else - the two buttons are what record progress
    expect(component['stopViews']()[0].navigationUrl).toBeDefined();
    expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
  });

  it('offers nothing left to press once the last stop is done', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: guidance.stops.map(stop => ({...stop, completed: true}))
    }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSelectedRouteChange'](testRoute);

    expect(component['currentIndex']()).toBe(2);
    expect(component['forwardDisabled']()).toBe(true);
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

    component['goForward'](component['stops']()[0]);
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

    component['goForward'](component['stops']()[2]);

    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 220, true);
    expect(component['currentIndex']()).toBe(2);
  });

  it('does not move on when the tick could not be stored', () => {
    routeApiMock.setStopCompletion = vi.fn(() => throwError(() => new Error('failed')));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['goForward'](component['stops']()[0]);

    expect(component['currentIndex']()).toBe(0);
  });

  it('takes the tick back on the stop it goes back to', () => {
    routeApiMock.getRouteGuidance = vi.fn(() => of<RouteGuidanceData>({
      ...guidance,
      stops: [{...shopStop, completed: true, completedBy: 'E2E Test'}, pauseStop, secondShopStop]
    }));
    routeApiMock.setStopCompletion = vi.fn(() => of<RouteGuidanceStop>({...shopStop, completed: false}));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);
    expect(component['currentIndex']()).toBe(1);

    component['goBack']();
    fixture.detectChanges();

    expect(component['currentIndex']()).toBe(0);
    expect(routeApiMock.setStopCompletion).toHaveBeenCalledWith(2, 200, false);
    expect(component['stopViews']()[0].stop.completed).toBe(false);
    expect(component['stopViews']()[0].completedLabel).toBeUndefined();
  });

  it('sends nothing when the stop it goes back to was open anyway', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);
    component['goToNextStop']();

    component['goBack']();

    expect(component['currentIndex']()).toBe(0);
    expect(routeApiMock.setStopCompletion).not.toHaveBeenCalled();
  });

  it('drops a stop answer that arrives after another route was picked', () => {
    const pendingCompletion = new Subject<RouteGuidanceStop>();
    routeApiMock.setStopCompletion = vi.fn(() => pendingCompletion.asObservable());
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onSelectedRouteChange'](testRoute);

    component['goForward'](component['stops']()[0]);
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

    component['goForward'](component['stops']()[0]);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(component['stopViews']()[0].stop.completed).toBe(false);
    expect(component['pendingStopId']()).toBeUndefined();
  });
});
