import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {SettingsShopsComponent} from './settings-shops.component';
import {ShopApiService, ShopItem, ShopListResponse} from '../../../../api/shop-api.service';
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

  let shopApiMock: Partial<ShopApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    shopApiMock = {
      getAllShops: vi.fn(() => of<ShopListResponse>({shops: [testShop1, testShop2]})),
      createShop: vi.fn(() => of(testShop1)),
      updateShop: vi.fn(() => of(testShop1))
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
        {provide: ShopApiService, useValue: shopApiMock},
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

    expect(fixture.componentInstance['shops']()?.shops.length).toBe(2);
  });

  it('shows an error toast when loading fails', () => {
    shopApiMock.getAllShops = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
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

  it('toggleShopVisibility() persists the new enabled state', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['toggleShopVisibility'](testShop1, false);

    expect(shopApiMock.updateShop).toHaveBeenCalledWith(testShop1.id, {...testShop1, enabled: false});
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('toggleShopVisibility() shows an error toast when saving fails', () => {
    shopApiMock.updateShop = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['toggleShopVisibility'](testShop1, false);

    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('viewShopDetails() opens the details dialog', () => {
    const fixture = TestBed.createComponent(SettingsShopsComponent);
    fixture.detectChanges();
    fixture.componentInstance['viewShopDetails'](testShop1);

    expect(matDialogMock.open).toHaveBeenCalled();
  });

});
