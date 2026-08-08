import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RouteEditDialogComponent} from './route-edit-dialog.component';
import {RouteData} from '../../../../../api/route-api.service';
import {ShopItem} from '../../../../../api/shop-api.service';

describe('RouteEditDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<RouteEditDialogComponent>>;

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
    number: 1.5,
    name: 'Route 1',
    note: 'Notiz 1',
    enabled: true,
    stops: [
      {id: 11, time: '14:00:00', shopId: testShop.id, description: 'Stopp 1'},
      {id: 12, time: '14:30:00', shopId: undefined, description: 'Pause'}
    ]
  };

  const configure = async (data: unknown) => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.resetTestingModule().configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  };

  it('prefills the form of an existing route including its stops', async () => {
    await configure({route: testRoute, shops: [testShop]});
    const fixture = TestBed.createComponent(RouteEditDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.form.value.name).toBe('Route 1');
    expect(component.form.value.number).toBe(1.5);
    expect(component.stops.length).toBe(2);
    expect(component.stops.at(0).value).toEqual({
      time: '14:00:00',
      shopId: testShop.id,
      description: 'Stopp 1'
    });
    expect(component.stops.at(1).value.shopId).toBeNull();
  });

  it('starts without stops for a new route', async () => {
    await configure({route: undefined, shops: [testShop]});
    const fixture = TestBed.createComponent(RouteEditDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.stops.length).toBe(0);
    expect(fixture.componentInstance.form.value.enabled).toBe(true);
  });

  it('addStop() and removeStop() maintain the stops form array', async () => {
    await configure({route: undefined, shops: [testShop]});
    const fixture = TestBed.createComponent(RouteEditDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.addStop();
    component.addStop();
    expect(component.stops.length).toBe(2);

    component.removeStop(0);
    expect(component.stops.length).toBe(1);
  });

  it('save() does not close while a stop is missing its time', async () => {
    await configure({route: undefined, shops: [testShop]});
    const fixture = TestBed.createComponent(RouteEditDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.patchValue({number: 1, name: 'Route 1'});
    component.addStop();
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('save() closes with the form value', async () => {
    await configure({route: testRoute, shops: [testShop]});
    const fixture = TestBed.createComponent(RouteEditDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({name: 'Route 1 neu'});
    fixture.componentInstance.save();

    expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({name: 'Route 1 neu'}));
  });

  it('cancel() closes without a value', async () => {
    await configure({route: testRoute, shops: [testShop]});
    const fixture = TestBed.createComponent(RouteEditDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

});
