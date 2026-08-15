import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {SettingsRoutesComponent} from './settings-routes.component';
import {RouteApiService, RouteData, RouteList} from '../../../../api/route-api.service';
import {ShopApiService, ShopItem, ShopListResponse} from '../../../../api/shop-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsRoutesComponent', () => {
  const activeShop: ShopItem = {
    id: 1,
    number: 100,
    name: 'Billa',
    addressStreet: 'Teststraße 1',
    addressPostalCode: 1100,
    addressCity: 'Wien',
    foodUnit: 'BOX',
    enabled: true
  };
  const disabledShop: ShopItem = {...activeShop, id: 2, number: 200, name: 'Hofer', enabled: false};

  const testRoute1: RouteData = {
    id: 1,
    number: 1,
    name: 'Route 1',
    note: 'Notiz 1',
    enabled: true,
    stops: [
      {id: 11, time: '14:00:00', shopId: activeShop.id, description: 'Stopp 1'},
      {id: 12, time: '15:30:00', shopId: undefined, description: 'Pause'}
    ]
  };
  const testRoute2: RouteData = {
    id: 2,
    number: 2,
    name: 'Route 2',
    enabled: false,
    stops: []
  };

  let routeApiMock: Partial<RouteApiService>;
  let shopApiMock: Partial<ShopApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    routeApiMock = {
      getAllRoutes: vi.fn(() => of<RouteList>({routes: [testRoute1, testRoute2]})),
      createRoute: vi.fn(() => of(testRoute1)),
      updateRoute: vi.fn(() => of(testRoute1))
    };

    shopApiMock = {
      getAllShops: vi.fn(() => of<ShopListResponse>({shops: [activeShop, disabledShop]}))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    matDialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: RouteApiService, useValue: routeApiMock},
        {provide: ShopApiService, useValue: shopApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads routes and shops on init', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['visibleRoutes']().length).toBe(2);
    expect(fixture.componentInstance['totalCount']()).toBe(2);
    expect(fixture.componentInstance['enabledCount']()).toBe(1);
    expect(fixture.componentInstance['activeShops']().map(shop => shop.id)).toEqual([activeShop.id]);
    expect(fixture.componentInstance['loaded']()).toBe(true);
  });

  it('resolves every stop against its shop and shortens the time', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();

    const stops = fixture.componentInstance['visibleRoutes']()[0].stops;
    expect(stops[0]).toEqual({
      key: 'stop-11',
      time: '14:00',
      label: '100 - Billa',
      shopAddress: 'Teststraße 1, 1100 Wien',
      description: 'Stopp 1'
    });
    // a stop without a shop is identified by its description alone, so that becomes the label
    expect(stops[1].label).toBe('Pause');
    expect(stops[1].shopAddress).toBeUndefined();
    expect(stops[1].description).toBeUndefined();
  });

  it('composes a maps link over the resolved shop addresses, skipping stops without one', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();

    const [withStops, withoutStops] = fixture.componentInstance['visibleRoutes']();
    // only the first stop resolves a shop address; the "Pause" stop has none to navigate to
    expect(withStops.mapsUrl).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Teststra%C3%9Fe%201%2C%201100%20Wien&travelmode=driving'
    );
    expect(withStops.mapsUrlTruncatedHint).toBeUndefined();
    // a route with no stops at all has nothing to navigate to
    expect(withoutStops.mapsUrl).toBeUndefined();
  });

  it('hints at the stops left out once a route has more than 10 shop stops', () => {
    const manyStopsRoute: RouteData = {
      ...testRoute2,
      enabled: true,
      stops: Array.from({length: 11}, (_, i) => ({
        id: 100 + i,
        time: `${String(i).padStart(2, '0')}:00:00`,
        shopId: activeShop.id
      }))
    };
    routeApiMock.getAllRoutes = vi.fn(() => of<RouteList>({routes: [manyStopsRoute]}));

    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();

    const view = fixture.componentInstance['visibleRoutes']()[0];
    expect(view.mapsUrl).toBeDefined();
    expect(view.mapsUrlTruncatedHint).toBe(
      'Die Karte deckt die ersten 10 Stopps ab. Der Stopp danach ist einzeln zu navigieren.'
    );
  });

  it('summarizes the stops of a route', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();

    const [first, second] = fixture.componentInstance['visibleRoutes']();
    expect(first.stopsSummary).toBe('2 Stopps · 14:00 – 15:30');
    expect(second.stopsSummary).toBe('Keine Stopps');
  });

  it('shows an error toast when loading fails and does not stay in the loading state', () => {
    routeApiMock.getAllRoutes = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
    expect(fixture.componentInstance['loaded']()).toBe(true);
  });

  it('filters by the search text across name, note and stops', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('route 2');
    expect(component['visibleRoutes']().map(view => view.route.id)).toEqual([testRoute2.id]);

    component['searchControl'].setValue('notiz 1');
    expect(component['visibleRoutes']().map(view => view.route.id)).toEqual([testRoute1.id]);

    component['searchControl'].setValue('billa');
    expect(component['visibleRoutes']().map(view => view.route.id)).toEqual([testRoute1.id]);

    component['searchControl'].setValue('gibtsnicht');
    expect(component['visibleRoutes']()).toEqual([]);
  });

  it('filters by the enabled state', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['enabledFilter'].set('ENABLED');
    expect(component['visibleRoutes']().map(view => view.route.id)).toEqual([testRoute1.id]);

    component['enabledFilter'].set('DISABLED');
    expect(component['visibleRoutes']().map(view => view.route.id)).toEqual([testRoute2.id]);

    component['enabledFilter'].set('ALL');
    expect(component['visibleRoutes']().length).toBe(2);
  });

  it('sorts by number even when names would order the other way round', () => {
    const routeA: RouteData = {...testRoute1, id: 10, number: 2, name: 'Alpha'};
    const routeB: RouteData = {...testRoute1, id: 20, number: 1, name: 'Beta'};
    routeApiMock.getAllRoutes = vi.fn(() => of<RouteList>({routes: [routeA, routeB]}));

    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['visibleRoutes']().map(view => view.route.id)).toEqual([routeB.id, routeA.id]);
  });

  it('expands a route on its own when the search only matches through its stops', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['isExpanded'](testRoute1.id)).toBe(false);

    // "billa" is a shop on testRoute1's stops, invisible while the card is collapsed
    component['searchControl'].setValue('billa');
    fixture.detectChanges();

    expect(component['isExpanded'](testRoute1.id)).toBe(true);

    // clearing the search keeps the route open - only the summary toggle collapses it again
    component['clearSearch']();
    fixture.detectChanges();
    expect(component['isExpanded'](testRoute1.id)).toBe(true);
  });

  it('does not expand a route the search matches by its name alone', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('route 1');
    fixture.detectChanges();

    expect(component['isExpanded'](testRoute1.id)).toBe(false);
  });

  it('announces the visible route count for screen readers', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['searchAnnouncement']()).toBe('2 von 2 Routen');

    component['searchControl'].setValue('route 2');
    expect(component['searchAnnouncement']()).toBe('1 von 2 Routen');
  });

  it('clearSearch() resets the search field', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('route 2');
    expect(component['filtered']()).toBe(true);

    component['clearSearch']();

    expect(component['searchControl'].value).toBe('');
    expect(component['filtered']()).toBe(false);
    expect(component['visibleRoutes']().length).toBe(2);
  });

  it('addRoute() offers only active shops', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['addRoute']();

    expect(matDialogMock.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: {route: undefined, shops: [activeShop]}
    }));
  });

  it('addRoute() creates the route returned by the dialog', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(testRoute1)})) as any;

    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['addRoute']();

    expect(routeApiMock.createRoute).toHaveBeenCalledWith(testRoute1);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('editRoute() offers only the active shops', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['editRoute'](testRoute1);

    expect(matDialogMock.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: {route: testRoute1, shops: [activeShop]}
    }));
  });

  it('editRoute() updates the route returned by the dialog', () => {
    const updated = {...testRoute1, name: 'Route 1 neu'};
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(updated)})) as any;

    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['editRoute'](testRoute1);

    expect(routeApiMock.updateRoute).toHaveBeenCalledWith(testRoute1.id, updated);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('setRouteEnabled() persists the new enabled state', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['setRouteEnabled'](testRoute1, false);

    expect(routeApiMock.updateRoute).toHaveBeenCalledWith(testRoute1.id, {...testRoute1, enabled: false});
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('setRouteEnabled() re-enables a deactivated route', () => {
    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['setRouteEnabled'](testRoute2, true);

    expect(routeApiMock.updateRoute).toHaveBeenCalledWith(testRoute2.id, {...testRoute2, enabled: true});
  });

  it('setRouteEnabled() shows an error toast and reloads when saving fails', () => {
    routeApiMock.updateRoute = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsRoutesComponent);
    fixture.detectChanges();
    fixture.componentInstance['setRouteEnabled'](testRoute1, false);

    expect(toastrMock.error).toHaveBeenCalled();
    // the failed toggle has to be undone visually, which only a reload can do
    expect(routeApiMock.getAllRoutes).toHaveBeenCalledTimes(2);
  });

});
