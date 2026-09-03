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

  describe('shopAutocompleteDisplay', () => {

    // MatAutocompleteTrigger writes a selected option's raw value straight into the native input
    // via this function, bypassing shopDisplayText() - see the method's own doc comment. Without
    // this passthrough/formatting, re-picking the already-selected shop showed "[object Object]".
    it('passes an already-formatted string through unchanged', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['shopAutocompleteDisplay']('100 - Billa')).toBe('100 - Billa');
    });

    it('formats a raw shop value the same way the option list does', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['shopAutocompleteDisplay'](testShop)).toBe('100 - Billa');
    });

    it('formats a raw null value as "Keine Filiale"', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['shopAutocompleteDisplay'](null)).toBe('Keine Filiale');
    });

  });

  describe('live stop order preview', () => {

    it('shows the stops in time order even though they were entered out of order', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.addStop();
      component.stops.at(0).patchValue({time: '15:00', shopId: testShop.id});
      component.addStop();
      component.stops.at(1).patchValue({time: '09:00', description: 'Pause'});

      expect(component['orderedStopsPreview']()).toEqual([
        {key: 'stop-1', timeLabel: '09:00', label: 'Pause'},
        {key: 'stop-0', timeLabel: '15:00', label: '100 - Billa'}
      ]);
    });

    it('skips a stop that has no time yet', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.addStop();
      expect(component['orderedStopsPreview']()).toEqual([]);
    });

  });

  describe('stop list warnings', () => {

    it('warns about a stop without a time', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.addStop();
      expect(component['stopWarnings']()).toContain('1 Stopp hat noch keine Uhrzeit.');
    });

    it('warns about a shop used more than once', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.addStop();
      component.stops.at(0).patchValue({time: '09:00', shopId: testShop.id});
      component.addStop();
      component.stops.at(1).patchValue({time: '10:00', shopId: testShop.id});

      expect(component['stopWarnings']()).toContain('Billa ist 2-mal als Stopp eingetragen.');
    });

    it('warns about an unusually short gap between two neighboring stops', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.addStop();
      component.stops.at(0).patchValue({time: '09:00', description: 'Erster Stopp'});
      component.addStop();
      component.stops.at(1).patchValue({time: '09:02', description: 'Zweiter Stopp'});

      expect(component['stopWarnings']()).toContain(
        'Zeitabstand zwischen 09:00 (Erster Stopp) und 09:02 (Zweiter Stopp) wirkt ungewöhnlich (2 Min.) — bitte prüfen.'
      );
    });

    it('warns about an unusually long gap between two neighboring stops', async () => {
      await configure({route: undefined, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.addStop();
      component.stops.at(0).patchValue({time: '08:00', description: 'Erster Stopp'});
      component.addStop();
      component.stops.at(1).patchValue({time: '12:00', description: 'Zweiter Stopp'});

      expect(component['stopWarnings']()).toContain(
        'Zeitabstand zwischen 08:00 (Erster Stopp) und 12:00 (Zweiter Stopp) wirkt ungewöhnlich (240 Min.) — bitte prüfen.'
      );
    });

    it('has no warnings for a well-formed stop list', async () => {
      await configure({route: testRoute, shops: [testShop]});
      const fixture = TestBed.createComponent(RouteEditDialogComponent);
      fixture.detectChanges();

      // testRoute's two stops are 30 minutes apart, one shop each, both with a time
      expect(fixture.componentInstance['stopWarnings']()).toEqual([]);
    });

  });

});
