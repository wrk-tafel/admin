import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RouteDetailsDialogComponent} from './route-details-dialog.component';
import {RouteData} from '../../../../../api/route-api.service';
import {ShopItem} from '../../../../../api/shop-api.service';

describe('RouteDetailsDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<RouteDetailsDialogComponent>>;

  const testShop: ShopItem = {
    id: 1,
    number: 100,
    name: 'Billa',
    addressStreet: 'Teststraße 1',
    addressPostalCode: 1100,
    addressCity: 'Wien',
    foodUnit: 'BOX',
    enabled: true
  };

  const testRoute: RouteData = {
    id: 1,
    number: 1,
    name: 'Route 1',
    note: 'Notiz 1',
    enabled: true,
    stops: [
      {id: 11, time: '14:00:00', shopId: testShop.id, description: 'Stopp 1'},
      {id: 12, time: '14:30:00', description: 'Pause'}
    ]
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {route: testRoute, shops: [testShop]}}
      ]
    }).compileComponents();
  });

  it('renders the route with its stops', () => {
    const fixture = TestBed.createComponent(RouteDetailsDialogComponent);
    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('Route 1');
    expect(native.textContent).toContain('Notiz 1');
    expect(native.textContent).toContain('14:00:00');
    expect(native.textContent).toContain('100 - Billa');
    expect(native.textContent).toContain('Kein Markt');
    expect(native.textContent).toContain('Pause');
  });

  it('close() closes the dialog', () => {
    const fixture = TestBed.createComponent(RouteDetailsDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.close();

    expect(dialogRef.close).toHaveBeenCalled();
  });

});
