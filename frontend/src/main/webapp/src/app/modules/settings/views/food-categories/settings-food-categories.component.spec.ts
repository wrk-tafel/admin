import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsFoodCategoriesComponent} from './settings-food-categories.component';
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsFoodCategoriesComponent', () => {

  beforeEach(() => {
    const foodCategoriesApiMock: Partial<FoodCategoriesApiService> = {
      getAllFoodCategories: () => of<FoodCategory[]>([])
    };

    const toastrMock: Partial<TafelToastrService> = {
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
    expect(component['foodCategories']()).toEqual([]);
  });

});
