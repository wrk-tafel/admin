import {TestBed} from '@angular/core/testing';
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
