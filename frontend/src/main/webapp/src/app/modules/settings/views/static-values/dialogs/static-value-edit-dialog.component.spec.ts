import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {StaticValueEditDialogComponent} from './static-value-edit-dialog.component';
import {StaticValueItem, StaticValueTypeEnum} from '../../../../../api/settings-api.service';

describe('StaticValueEditDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<StaticValueEditDialogComponent>>;
  const testStaticValue: StaticValueItem = {
    id: 1,
    type: StaticValueTypeEnum.TOLERANCE,
    validFrom: '2026-01-01',
    validTo: '2999-12-31',
    amount: 100,
    countAdults: null,
    countChildren: null,
    age: null
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {staticValue: testStaticValue}}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes the form with only the amount, and exposes the rest as read-only data', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toEqual({amount: testStaticValue.amount});
    expect(Object.keys(component.form.controls)).toEqual(['amount']);
    expect(component.data.staticValue).toEqual(testStaticValue);
  });

  it('save() closes dialog with only the amount changed, everything else untouched', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({amount: 200});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      ...testStaticValue,
      amount: 200
    });
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
