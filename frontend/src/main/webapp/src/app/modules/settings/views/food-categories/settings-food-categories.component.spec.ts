import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {SettingsFoodCategoriesComponent} from './settings-food-categories.component';
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsFoodCategoriesComponent', () => {
  const testCategory: FoodCategory = {
    id: 1,
    name: 'Backwaren',
    weightPerUnit: 9,
        sortOrder: 1,
    enabled: true
  };
  const testCategory2: FoodCategory = {
    id: 2,
    name: 'Getränke',
    weightPerUnit: 10,
        sortOrder: 2,
    enabled: true
  };

  let foodCategoriesApiMock: Partial<FoodCategoriesApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    foodCategoriesApiMock = {
      getAllFoodCategories: vi.fn(() => of<FoodCategory[]>([testCategory, testCategory2])),
      updateFoodCategory: vi.fn(() => of(testCategory)),
      createFoodCategory: vi.fn(() => of(testCategory)),
      reorderFoodCategories: vi.fn(() => of([testCategory2, testCategory]))
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
        provideRouter([]),
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
    expect(component['foodCategories']()).toEqual([testCategory, testCategory2]);
  });

  it('startEdit() enters edit mode for the given row and prefills the fields', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);

    expect(component['editingId']()).toBe(testCategory.id);
    expect(component['nameControl'].value).toBe(testCategory.name);
    expect(component['weightPerUnitControl'].value).toBe(testCategory.weightPerUnit);
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

  it('drop() reorders optimistically and persists the new order', () => {
    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<FoodCategory[]>;
    component['drop'](event);

    // optimistic reorder happens synchronously, before the API call resolves
    expect(component['foodCategories']().map(c => c.id)).toEqual([testCategory2.id, testCategory.id]);
    expect(foodCategoriesApiMock.reorderFoodCategories).toHaveBeenCalledWith([testCategory2.id, testCategory.id]);
  });

  it('drop() reverts and shows an error toast when persisting fails', () => {
    foodCategoriesApiMock.reorderFoodCategories = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<FoodCategory[]>;
    component['drop'](event);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(foodCategoriesApiMock.getAllFoodCategories).toHaveBeenCalledTimes(2);
  });

  // The number scales every warehouse statistic, so a bare figure would be one unit mix-up away
  // from a wrong report - and a category without a weight contributes 0 kg without saying so.
  it('renders the weight with its unit and flags a category that has none', () => {
    const withoutWeight: FoodCategory = {id: 3, name: 'Konserven', weightPerUnit: null, sortOrder: 3, enabled: true};
    foodCategoriesApiMock.getAllFoodCategories =
      vi.fn(() => of<FoodCategory[]>([testCategory, withoutWeight]));

    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();

    const weightCell = (index: number) => fixture.nativeElement
      .querySelector(`[testid="foodCategoryWeightPerUnit-${index}"]`)
      .textContent.replace(/\s+/g, ' ').trim();

    expect(weightCell(0)).toBe('9 kg');
    expect(weightCell(1)).toBe('kein Gewicht - zählt mit 0 kg');
  });

  it('shows only the categories matching the status filter and counts the active ones', () => {
    const disabledCategory: FoodCategory = {id: 3, name: 'Konserven', weightPerUnit: 5, sortOrder: 3, enabled: false};
    foodCategoriesApiMock.getAllFoodCategories =
      vi.fn(() => of<FoodCategory[]>([testCategory, testCategory2, disabledCategory]));

    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['visibleFoodCategories']().map(c => c.id)).toEqual([1, 2, 3]);
    expect(component['enabledCount']()).toBe(2);
    expect(component['totalCount']()).toBe(3);

    component['onFilterChanged']('ENABLED');
    expect(component['visibleFoodCategories']().map(c => c.id)).toEqual([1, 2]);

    component['onFilterChanged']('DISABLED');
    expect(component['visibleFoodCategories']().map(c => c.id)).toEqual([3]);
  });

  it('reorders within the full list when a filter hides categories in between', () => {
    // enabled, disabled, enabled - so moving the first active one down has to jump the hidden one
    const hiddenCategory: FoodCategory = {id: 3, name: 'Konserven', weightPerUnit: 5, sortOrder: 2, enabled: false};
    foodCategoriesApiMock.getAllFoodCategories =
      vi.fn(() => of<FoodCategory[]>([testCategory, hiddenCategory, testCategory2]));
    foodCategoriesApiMock.reorderFoodCategories =
      vi.fn(() => of<FoodCategory[]>([hiddenCategory, testCategory2, testCategory]));

    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['onFilterChanged']('ENABLED');

    component['moveFoodCategory'](0, 1);

    expect(foodCategoriesApiMock.reorderFoodCategories)
      .toHaveBeenCalledWith([hiddenCategory.id, testCategory2.id, testCategory.id]);
    expect(component['visibleFoodCategories']().map(c => c.id)).toEqual([testCategory2.id, testCategory.id]);
  });

  it('ignores a keyboard move past the end of the filtered list', () => {
    const hiddenCategory: FoodCategory = {id: 3, name: 'Konserven', weightPerUnit: 5, sortOrder: 3, enabled: false};
    foodCategoriesApiMock.getAllFoodCategories =
      vi.fn(() => of<FoodCategory[]>([testCategory, testCategory2, hiddenCategory]));

    const fixture = TestBed.createComponent(SettingsFoodCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['onFilterChanged']('ENABLED');

    component['moveFoodCategory'](1, 1);

    expect(foodCategoriesApiMock.reorderFoodCategories).not.toHaveBeenCalled();
  });

});
