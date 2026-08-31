import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {CountryCreateDialogComponent} from './country-create-dialog.component';

describe('CountryCreateDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<CountryCreateDialogComponent>>;

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
    const fixture = TestBed.createComponent(CountryCreateDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes form with blank defaults', () => {
    const fixture = TestBed.createComponent(CountryCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      code: '',
      name: '',
      enabled: true
    });
  });

  it('save() closes dialog with the uppercased code when valid', () => {
    const fixture = TestBed.createComponent(CountryCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({code: 'zz', name: 'Neuland'});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({code: 'ZZ', name: 'Neuland', enabled: true});
  });

  it('save() does not close dialog when invalid', () => {
    const fixture = TestBed.createComponent(CountryCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('save() rejects a code that is not exactly two letters', () => {
    const fixture = TestBed.createComponent(CountryCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({code: 'ABC', name: 'Neuland'});
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.form.controls.code.invalid).toBe(true);
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(CountryCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
