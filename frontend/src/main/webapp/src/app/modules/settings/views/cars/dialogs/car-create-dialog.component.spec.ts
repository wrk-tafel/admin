import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {CarCreateDialogComponent} from './car-create-dialog.component';

describe('CarCreateDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<CarCreateDialogComponent>>;

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef}
      ]
    }).compileComponents();
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

  it('save() closes dialog with form value when valid', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({licensePlate: 'W-123', name: 'New Car'});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(component.form.value);
  });

  it('save() does not close dialog when invalid', () => {
    const fixture = TestBed.createComponent(CarCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.save();

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
