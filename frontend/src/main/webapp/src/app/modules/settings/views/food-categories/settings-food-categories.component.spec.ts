import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsFoodCategoriesComponent} from './settings-food-categories.component';
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsFoodCategoriesComponent', () => {
  const testCategory: FoodCategory = {
    id: 1,
    name: 'Backwaren',
    weightPerUnit: 9,
    returnItem: false,
    sortOrder: 1000,
    enabled: true
  };

  let foodCategoriesApiMock: Partial<FoodCategoriesApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    foodCategoriesApiMock = {
      getAllFoodCategories: vi.fn(() => of<FoodCategory[]>([testCategory])),
      updateFoodCategory: vi.fn(() => of(testCategory)),
      createFoodCategory: vi.fn(() => of(testCategory))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    const matDialogMock: Partial<MatDialog> = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: FoodCategoriesApiService, useValue: foodCategoriesApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads food categories on init', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['foodCategories']()).toEqual([testCategory]);
  });

  it('startEdit() enters edit mode for the given row and prefills the fields', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);

    expect(component['editingId']()).toBe(testCategory.id);
    expect(component['nameControl'].value).toBe(testCategory.name);
    expect(component['weightPerUnitControl'].value).toBe(testCategory.weightPerUnit);
    expect(component['sortOrderControl'].value).toBe(testCategory.sortOrder);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(foodCategoriesApiMock.updateFoodCategory).not.toHaveBeenCalled();
  });

  it('saveEdit() sends the changed fields, shows a success toast and reloads', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);
    component['nameControl'].setValue('Updated Name');
    component['saveEdit'](testCategory);

    expect(foodCategoriesApiMock.updateFoodCategory).toHaveBeenCalledWith(testCategory.id, {
      ...testCategory,
      name: 'Updated Name'
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('toggleFoodCategoryVisibility() updates enabled flag', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleFoodCategoryVisibility'](testCategory, false);

    expect(foodCategoriesApiMock.updateFoodCategory).toHaveBeenCalledWith(testCategory.id, {
      ...testCategory,
      enabled: false
    });
    expect(toastrMock.success).toHaveBeenCalled();
  });

});
