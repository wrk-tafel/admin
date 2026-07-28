import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FoodCategoryEditDialogComponent} from './food-category-edit-dialog.component';
import {FoodCategory} from '../../../../../api/food-categories-api.service';

describe('FoodCategoryEditDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<FoodCategoryEditDialogComponent>>;
  const testCategory: FoodCategory = {
    id: 1,
    name: 'Test Category',
    weightPerUnit: 1.5,
    returnItem: false,
    sortOrder: 10,
    enabled: true
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {category: testCategory}}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCategoryEditDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes form with provided category data', () => {
    const fixture = TestBed.createComponent(FoodCategoryEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      id: testCategory.id,
      name: testCategory.name,
      weightPerUnit: testCategory.weightPerUnit,
      returnItem: testCategory.returnItem,
      sortOrder: testCategory.sortOrder,
      enabled: testCategory.enabled
    });
  });

  it('save() closes dialog with form value when valid', () => {
    const fixture = TestBed.createComponent(FoodCategoryEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({name: 'Updated', sortOrder: 5});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(component.form.value);
  });

  it('save() does not close dialog when invalid', () => {
    const fixture = TestBed.createComponent(FoodCategoryEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({name: ''});
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(FoodCategoryEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
