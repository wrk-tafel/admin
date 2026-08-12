import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {SettingsFoodReturnCategoriesComponent} from './settings-food-return-categories.component';
import {FoodReturnCategoriesApiService, FoodReturnCategory} from '../../../../api/food-return-categories-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsFoodReturnCategoriesComponent', () => {
  const testCategory: FoodReturnCategory = {
    id: 11,
    name: 'Graue Kisten',
    sortOrder: 1,
    enabled: true
  };
  const testCategory2: FoodReturnCategory = {
    id: 12,
    name: 'Klappkisten schwarz',
    sortOrder: 2,
    enabled: true
  };

  let foodReturnCategoriesApiMock: Partial<FoodReturnCategoriesApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    foodReturnCategoriesApiMock = {
      getAllFoodReturnCategories: vi.fn(() => of<FoodReturnCategory[]>([testCategory, testCategory2])),
      updateFoodReturnCategory: vi.fn(() => of(testCategory)),
      createFoodReturnCategory: vi.fn(() => of(testCategory)),
      reorderFoodReturnCategories: vi.fn(() => of([testCategory2, testCategory]))
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
        {provide: FoodReturnCategoriesApiService, useValue: foodReturnCategoriesApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads return categories on init', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['foodReturnCategories']()).toEqual([testCategory, testCategory2]);
  });

  it('startEdit() enters edit mode for the given row and prefills the name', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);

    expect(component['editingId']()).toBe(testCategory.id);
    expect(component['nameControl'].value).toBe(testCategory.name);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(foodReturnCategoriesApiMock.updateFoodReturnCategory).not.toHaveBeenCalled();
  });

  it('saveEdit() sends the changed name, shows a success toast and reloads', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCategory);
    component['nameControl'].setValue('Updated Name');
    component['saveEdit'](testCategory);

    expect(foodReturnCategoriesApiMock.updateFoodReturnCategory).toHaveBeenCalledWith(testCategory.id, {
      ...testCategory,
      name: 'Updated Name'
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('toggleFoodReturnCategoryVisibility() updates the enabled flag', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleFoodReturnCategoryVisibility'](testCategory, false);

    expect(foodReturnCategoriesApiMock.updateFoodReturnCategory).toHaveBeenCalledWith(testCategory.id, {
      ...testCategory,
      enabled: false
    });
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('drop() reorders optimistically and persists the new order', () => {
    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<FoodReturnCategory[]>;
    component['drop'](event);

    // optimistic reorder happens synchronously, before the API call resolves
    expect(component['foodReturnCategories']().map(c => c.id)).toEqual([testCategory2.id, testCategory.id]);
    expect(foodReturnCategoriesApiMock.reorderFoodReturnCategories)
      .toHaveBeenCalledWith([testCategory2.id, testCategory.id]);
  });

  it('drop() reverts and shows an error toast when persisting fails', () => {
    foodReturnCategoriesApiMock.reorderFoodReturnCategories = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<FoodReturnCategory[]>;
    component['drop'](event);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(foodReturnCategoriesApiMock.getAllFoodReturnCategories).toHaveBeenCalledTimes(2);
  });

  it('shows only the categories matching the status filter and counts the active ones', () => {
    const disabledCategory: FoodReturnCategory = {id: 13, name: 'Alte Kisten', sortOrder: 3, enabled: false};
    foodReturnCategoriesApiMock.getAllFoodReturnCategories =
      vi.fn(() => of<FoodReturnCategory[]>([testCategory, testCategory2, disabledCategory]));

    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['visibleFoodReturnCategories']().map(c => c.id)).toEqual([11, 12, 13]);
    expect(component['enabledCount']()).toBe(2);
    expect(component['totalCount']()).toBe(3);

    component['enabledFilter'].set('ENABLED');
    expect(component['visibleFoodReturnCategories']().map(c => c.id)).toEqual([11, 12]);

    component['enabledFilter'].set('DISABLED');
    expect(component['visibleFoodReturnCategories']().map(c => c.id)).toEqual([13]);
  });

  it('reorders within the full list when a filter hides categories in between', () => {
    // enabled, disabled, enabled - so moving the first active one down has to jump the hidden one
    const hiddenCategory: FoodReturnCategory = {id: 13, name: 'Alte Kisten', sortOrder: 2, enabled: false};
    foodReturnCategoriesApiMock.getAllFoodReturnCategories =
      vi.fn(() => of<FoodReturnCategory[]>([testCategory, hiddenCategory, testCategory2]));
    foodReturnCategoriesApiMock.reorderFoodReturnCategories =
      vi.fn(() => of<FoodReturnCategory[]>([hiddenCategory, testCategory2, testCategory]));

    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['enabledFilter'].set('ENABLED');

    component['moveFoodReturnCategory'](0, 1);

    expect(foodReturnCategoriesApiMock.reorderFoodReturnCategories)
      .toHaveBeenCalledWith([hiddenCategory.id, testCategory2.id, testCategory.id]);
    expect(component['visibleFoodReturnCategories']().map(c => c.id)).toEqual([testCategory2.id, testCategory.id]);
  });

  it('ignores a keyboard move past the end of the filtered list', () => {
    const hiddenCategory: FoodReturnCategory = {id: 13, name: 'Alte Kisten', sortOrder: 3, enabled: false};
    foodReturnCategoriesApiMock.getAllFoodReturnCategories =
      vi.fn(() => of<FoodReturnCategory[]>([testCategory, testCategory2, hiddenCategory]));

    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['enabledFilter'].set('ENABLED');

    component['moveFoodReturnCategory'](1, 1);

    expect(foodReturnCategoriesApiMock.reorderFoodReturnCategories).not.toHaveBeenCalled();
  });

  it('addFoodReturnCategory() creates the category returned by the dialog', () => {
    const created: FoodReturnCategory = {id: 0, name: 'Bananenkisten', sortOrder: 0, enabled: true};
    TestBed.inject(MatDialog).open = vi.fn(() => ({afterClosed: () => of(created)})) as any;

    const fixture = TestBed.createComponent(SettingsFoodReturnCategoriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addFoodReturnCategory']();

    expect(foodReturnCategoriesApiMock.createFoodReturnCategory).toHaveBeenCalledWith(created);
    expect(toastrMock.success).toHaveBeenCalled();
  });

});
