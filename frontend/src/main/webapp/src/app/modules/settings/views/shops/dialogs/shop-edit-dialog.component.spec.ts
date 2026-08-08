import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShopEditDialogComponent} from './shop-edit-dialog.component';
import {ShopItem} from '../../../../../api/shop-api.service';

describe('ShopEditDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<ShopEditDialogComponent>>;

  const testShop: ShopItem = {
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

  it('prefills the form of an existing shop', async () => {
    await configure({shop: testShop});
    const fixture = TestBed.createComponent(ShopEditDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.value).toEqual({
      id: testShop.id,
      number: testShop.number,
      name: testShop.name,
      addressStreet: testShop.addressStreet,
      addressPostalCode: testShop.addressPostalCode,
      addressCity: testShop.addressCity,
      foodUnit: testShop.foodUnit,
      phone: testShop.phone,
      contactPerson: testShop.contactPerson,
      note: testShop.note,
      enabled: true
    });
  });

  it('starts empty and active for a new shop', async () => {
    await configure({shop: undefined});
    const fixture = TestBed.createComponent(ShopEditDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.value.name).toBe('');
    expect(fixture.componentInstance.form.value.foodUnit).toBe('BOX');
    expect(fixture.componentInstance.form.value.enabled).toBe(true);
  });

  it('save() does not close an invalid form', async () => {
    await configure({shop: undefined});
    const fixture = TestBed.createComponent(ShopEditDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('save() closes with the form value', async () => {
    await configure({shop: testShop});
    const fixture = TestBed.createComponent(ShopEditDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({name: 'Billa Plus'});
    fixture.componentInstance.save();

    expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({name: 'Billa Plus'}));
  });

  it('cancel() closes without a value', async () => {
    await configure({shop: testShop});
    const fixture = TestBed.createComponent(ShopEditDialogComponent);
    fixture.detectChanges();

    fixture.componentInstance.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

});
