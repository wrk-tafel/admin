import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {CarEditDialogComponent} from './car-edit-dialog.component';
import {CarData} from '../../../../../api/car-api.service';

describe('CarEditDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<CarEditDialogComponent>>;
  const testCar: CarData = {
    id: 1,
    licensePlate: 'W-123',
    name: 'Test Car',
    enabled: true,
    sortOrder: 1
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {car: testCar}}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CarEditDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes form with provided car data', () => {
    const fixture = TestBed.createComponent(CarEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      id: testCar.id,
      licensePlate: testCar.licensePlate,
      name: testCar.name,
      enabled: true
    });
  });

  it('save() closes dialog with form value when valid', () => {
    const fixture = TestBed.createComponent(CarEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({name: 'Updated'});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(component.form.value);
  });

  it('save() does not close dialog when invalid', () => {
    const fixture = TestBed.createComponent(CarEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({licensePlate: ''});
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(CarEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
