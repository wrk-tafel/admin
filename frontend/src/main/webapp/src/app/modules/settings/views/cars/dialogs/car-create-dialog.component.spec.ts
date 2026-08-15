import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {CarCreateDialogComponent, CarCreateDialogData} from './car-create-dialog.component';
import {CarData} from '../../../../../api/car-api.service';

describe('CarCreateDialogComponent', () => {
  const activeCar: CarData = {id: 1, licensePlate: 'W-11111A', name: 'Bus 1', enabled: true, sortOrder: 1};
  const disabledCar: CarData = {id: 2, licensePlate: 'W-22222B', name: 'Bus 2', enabled: false, sortOrder: 2};

  let dialogRef: MockedObject<MatDialogRef<CarCreateDialogComponent>>;

  const configureWith = async (data: CarCreateDialogData) => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  };

  beforeEach(async () => {
    await configureWith({existingCars: [activeCar, disabledCar]});
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes form with blank defaults', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      licensePlate: '',
      name: '',
      sortOrder: 0,
      enabled: true
    });
  });

  it('save() closes dialog with the normalized form value when valid', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({licensePlate: ' w-33333c ', name: ' New Car '});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      create: {licensePlate: 'W-33333C', name: 'New Car', sortOrder: 0, enabled: true}
    });
  });

  it('save() does not close dialog when invalid', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('uppercaseLicensePlate() normalizes the case while typing', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.controls.licensePlate.setValue('w-44444d');
    component.uppercaseLicensePlate();

    expect(component.form.controls.licensePlate.value).toBe('W-44444D');
  });

  it('reports an existing car for a plate that only differs in case and spacing', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.controls.licensePlate.setValue(' w-11111a ');

    expect(component.duplicate()).toBe(activeCar);
  });

  it('reports no duplicate for an unused plate', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.controls.licensePlate.setValue('W-99999Z');

    expect(component.duplicate()).toBeUndefined();
  });

  it('save() refuses to create a car whose plate already exists', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({licensePlate: 'W-11111A', name: 'Bus 1 again'});
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('reactivate() closes dialog with the disabled car the plate belongs to', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.controls.licensePlate.setValue('w-22222b');
    component.reactivate();

    expect(dialogRef.close).toHaveBeenCalledWith({reactivate: disabledCar});
  });

  it('reactivate() does nothing without a matching car', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.controls.licensePlate.setValue('W-99999Z');
    component.reactivate();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
