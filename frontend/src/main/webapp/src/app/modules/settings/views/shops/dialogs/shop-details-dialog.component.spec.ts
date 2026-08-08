import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShopDetailsDialogComponent} from './shop-details-dialog.component';
import {ShopItem} from '../../../../../api/shop-api.service';

describe('ShopDetailsDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<ShopDetailsDialogComponent>>;

  const testShop: ShopItem = {
    id: 1,
    number: 100,
    name: 'Billa',
    addressStreet: 'Teststraße 1',
    addressPostalCode: 1100,
    addressCity: 'Wien',
    foodUnit: 'KG',
    phone: '01 234 56 78',
    contactPerson: 'Fr. Musterfrau',
    note: 'Notiz',
    enabled: true
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {shop: testShop}}
      ]
    }).compileComponents();
  });

  it('renders the shop details', () => {
    const fixture = TestBed.createComponent(ShopDetailsDialogComponent);
    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('100');
    expect(native.textContent).toContain('Billa');
    expect(native.textContent).toContain('Teststraße 1, 1100 Wien');
    expect(native.textContent).toContain('Kilogramm');
    expect(native.textContent).toContain('Fr. Musterfrau');
    expect(native.textContent).toContain('Ja');
  });

  it('close() closes the dialog', () => {
    const fixture = TestBed.createComponent(ShopDetailsDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.close();

    expect(dialogRef.close).toHaveBeenCalled();
  });

});
