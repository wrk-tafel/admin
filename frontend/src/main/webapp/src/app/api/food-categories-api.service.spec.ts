import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {FoodCategoriesApiService, FoodCategory} from './food-categories-api.service';

describe('FoodCategoriesApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: FoodCategoriesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        FoodCategoriesApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(FoodCategoriesApiService);
  });

  it('get active categories', () => {
    const mockCategories: FoodCategory[] = [
      {id: 0, name: 'Bakery', weightPerUnit: 1.5, returnItem: false, sortOrder: 0, enabled: true},
      {id: 1, name: 'Frozen Food', weightPerUnit: 2, returnItem: true, sortOrder: 1, enabled: true}
    ];

    apiService.getActiveFoodCategories().subscribe((data: FoodCategory[]) => {
      expect(data).toEqual(mockCategories);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/food-categories/active'});
    req.flush({categories: mockCategories});
    httpMock.verify();
  });

  it('get all categories', () => {
    const mockCategories: FoodCategory[] = [
      {id: 0, name: 'Bakery', weightPerUnit: 1.5, returnItem: false, sortOrder: 0, enabled: true},
      {id: 1, name: 'Frozen Food', weightPerUnit: 2, returnItem: true, sortOrder: 1, enabled: false}
    ];

    apiService.getAllFoodCategories().subscribe((data: FoodCategory[]) => {
      expect(data).toEqual(mockCategories);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/food-categories'});
    req.flush({categories: mockCategories});
    httpMock.verify();
  });

  it('create category', () => {
    const newCategory: FoodCategory = {
      id: 0, name: 'New Category', weightPerUnit: 1, returnItem: false, sortOrder: 0, enabled: true
    };
    const createdCategory: FoodCategory = {...newCategory, id: 42};

    apiService.createFoodCategory(newCategory).subscribe((data: FoodCategory) => {
      expect(data).toEqual(createdCategory);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/food-categories'});
    req.flush(createdCategory);
    httpMock.verify();
  });

  it('update category', () => {
    const updatedCategory: FoodCategory = {
      id: 1, name: 'Updated Category', weightPerUnit: 1, returnItem: false, sortOrder: 0, enabled: false
    };

    apiService.updateFoodCategory(1, updatedCategory).subscribe((data: FoodCategory) => {
      expect(data).toEqual(updatedCategory);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/food-categories/1'});
    req.flush(updatedCategory);
    httpMock.verify();
  });

});
