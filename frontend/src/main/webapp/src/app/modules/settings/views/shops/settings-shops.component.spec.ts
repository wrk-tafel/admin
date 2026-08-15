import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {SettingsShopsComponent} from './settings-shops.component';
import {ShopApiService, ShopItem, ShopListResponse} from '../../../../api/shop-api.service';
import {RouteApiService, RouteData, RouteList} from '../../../../api/route-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsShopsComponent', () => {
  const testShop1: ShopItem = {
    id: 1,
    number: 100,
    name: 'Billa',
    addressStreet: 'Teststraße 1',
    addressPostalCode: 1100,
    addressCity: 'Wien',
    foodUnit: 'BOX',
    phone: '01 234 56 78',
    contactPerson: 'Fr. Musterfrau',
    note: 'Notiz',
    enabled: true
  };
  const testShop2: ShopItem = {
    ...testShop1,
    id: 2,
    number: 200,
    name: 'Hofer',
    foodUnit: 'KG',
    enabled: false
  };

  const activeRoute: RouteData = {
    id: 1,
    number: 1,
    name: 'Route 1',
    enabled: true,
    stops: [{id: 1, time: '14:00:00', shopId: testShop1.id}]
  };
  const inactiveRoute: RouteData = {
    id: 2,
    number: 2,
    name: 'Route 2',
    enabled: false,
    stops: [{id: 2, time: '09:00:00', shopId: testShop1.id}]
  };

  let shopApiMock: Partial<ShopApiService>;
  let routeApiMock: Partial<RouteApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    shopApiMock = {
      getAllShops: vi.fn(() => of<ShopListResponse>({shops: [testShop1, testShop2]})),
      createShop: vi.fn(() => of(testShop1)),
      updateShop: vi.fn(() => of(testShop1))
    };

    routeApiMock = {
      getAllRoutes: vi.fn(() => of<RouteList>({routes: []}))
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
        provideRouter([]),
        {provide: ShopApiService, useValue: shopApiMock},
        {provide: RouteApiService, useValue: routeApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads shops on init', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['visibleShops']().length).toBe(2);
    expect(fixture.componentInstance['totalCount']()).toBe(2);
    expect(fixture.componentInstance['enabledCount']()).toBe(1);
  });

  it('builds the view of a shop with its address, unit label and map link', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();

    const [first, second] = fixture.componentInstance['visibleShops']();
    expect(first.address).toBe('Teststraße 1, 1100 Wien');
    expect(first.foodUnitLabel).toBe('Kisten');
    expect(first.mapUrl).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Teststra%C3%9Fe%201%2C%201100%20Wien&travelmode=driving'
    );
    expect(second.foodUnitLabel).toBe('Kilogramm');
  });

  it('shows an error toast when loading fails and does not stay in the loading state', () => {
    shopApiMock.getAllShops = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
    expect(fixture.componentInstance['loaded']()).toBe(true);
  });

  it('filters by the search text across number, name, address and contact', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('hofer');
    expect(component['visibleShops']().map(view => view.shop.id)).toEqual([testShop2.id]);

    component['searchControl'].setValue('musterfrau');
    expect(component['visibleShops']().length).toBe(2);

    component['searchControl'].setValue('200');
    expect(component['visibleShops']().map(view => view.shop.id)).toEqual([testShop2.id]);

    component['searchControl'].setValue('gibtsnicht');
    expect(component['visibleShops']()).toEqual([]);
  });

  it('filters by the enabled state', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['enabledFilter'].set('ENABLED');
    expect(component['visibleShops']().map(view => view.shop.id)).toEqual([testShop1.id]);

    component['enabledFilter'].set('DISABLED');
    expect(component['visibleShops']().map(view => view.shop.id)).toEqual([testShop2.id]);

    component['enabledFilter'].set('ALL');
    expect(component['visibleShops']().length).toBe(2);
  });

  it('clearSearch() resets the search field', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('hofer');
    expect(component['filtered']()).toBe(true);

    component['clearSearch']();

    expect(component['searchControl'].value).toBe('');
    expect(component['filtered']()).toBe(false);
    expect(component['visibleShops']().length).toBe(2);
  });

  it('addShop() creates the shop returned by the dialog', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(testShop1)})) as any;

    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['addShop']();

    expect(shopApiMock.createShop).toHaveBeenCalledWith(testShop1);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('editShop() updates the shop returned by the dialog', () => {
    const updated = {...testShop1, name: 'Billa Plus'};
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(updated)})) as any;

    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['editShop'](testShop1);

    expect(shopApiMock.updateShop).toHaveBeenCalledWith(testShop1.id, updated);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('setShopEnabled() persists the new enabled state directly when no route is affected', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['setShopEnabled'](testShop1, false);

    expect(matDialogMock.open).not.toHaveBeenCalled();
    expect(shopApiMock.updateShop).toHaveBeenCalledWith(testShop1.id, {...testShop1, enabled: false});
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('setShopEnabled() re-enables a deactivated shop without confirming', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['setShopEnabled'](testShop2, true);

    expect(matDialogMock.open).not.toHaveBeenCalled();
    expect(shopApiMock.updateShop).toHaveBeenCalledWith(testShop2.id, {...testShop2, enabled: true});
  });

  it('setShopEnabled() shows an error toast and reloads when saving fails', () => {
    shopApiMock.updateShop = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['setShopEnabled'](testShop1, false);

    expect(toastrMock.error).toHaveBeenCalled();
    // the failed toggle has to be undone visually, which only a reload can do
    expect(shopApiMock.getAllShops).toHaveBeenCalledTimes(2);
  });

  describe('routes stopping at a shop', () => {

    beforeEach(() => {
      routeApiMock.getAllRoutes = vi.fn(() => of<RouteList>({routes: [activeRoute, inactiveRoute]}));
    });

    it('lists every route stopping at the shop, active and inactive alike', () => {
      const fixture = TestBed.createComponent(SettingsShopsComponent);
      fixture.detectChanges();

      const [first, second] = fixture.componentInstance['visibleShops']();
      expect(first.routeUsage).toEqual([
        {routeId: 1, label: 'Route 1 (14:00)', routeEnabled: true},
        {routeId: 2, label: 'Route 2 (09:00)', routeEnabled: false}
      ]);
      expect(second.routeUsage).toEqual([]);
    });

    it('confirms before deactivating a shop an active route stops at', () => {
      matDialogMock.open = vi.fn(() => ({afterClosed: () => of(undefined)})) as any;

      const fixture = TestBed.createComponent(SettingsShopsComponent);
      fixture.detectChanges();
      fixture.componentInstance['setShopEnabled'](testShop1, false);

      expect(matDialogMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: {shopName: 'Billa', routeStopLabels: ['Route 1 (14:00)']}
        })
      );
      // the dialog was cancelled (afterClosed emits undefined), so nothing was persisted
      expect(shopApiMock.updateShop).not.toHaveBeenCalled();
    });

    it('deactivates the shop once the confirmation dialog is accepted', () => {
      matDialogMock.open = vi.fn(() => ({afterClosed: () => of(true)})) as any;

      const fixture = TestBed.createComponent(SettingsShopsComponent);
      fixture.detectChanges();
      fixture.componentInstance['setShopEnabled'](testShop1, false);

      expect(shopApiMock.updateShop).toHaveBeenCalledWith(testShop1.id, {...testShop1, enabled: false});
      expect(toastrMock.success).toHaveBeenCalled();
    });

  });

});
