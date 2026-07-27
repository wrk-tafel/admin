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

  it('initializes form with provided static value data', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      id: testStaticValue.id,
      type: testStaticValue.type,
      validFrom: testStaticValue.validFrom,
      validTo: testStaticValue.validTo,
      amount: testStaticValue.amount,
      countAdults: null,
      countChildren: null,
      age: null
    });
  });

  it('save() closes dialog with form value when valid', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({amount: 200});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(component.form.value);
  });

  it('save() does not close dialog when required fields are missing', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({validFrom: ''});
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(StaticValueEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
