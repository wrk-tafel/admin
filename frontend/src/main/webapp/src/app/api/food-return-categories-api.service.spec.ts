import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {FoodReturnCategoriesApiService, FoodReturnCategory} from './food-return-categories-api.service';

describe('FoodReturnCategoriesApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: FoodReturnCategoriesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        FoodReturnCategoriesApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(FoodReturnCategoriesApiService);
  });

  it('get active categories', () => {
    const mockCategories: FoodReturnCategory[] = [
      {id: 11, name: 'Graue Kisten', sortOrder: 1, enabled: true},
      {id: 12, name: 'Klappkisten schwarz', sortOrder: 2, enabled: true}
    ];

    apiService.getActiveFoodReturnCategories().subscribe((data: FoodReturnCategory[]) => {
      expect(data).toEqual(mockCategories);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/food-return-categories/active'});
    req.flush({categories: mockCategories});
    httpMock.verify();
  });

  it('get all categories', () => {
    const mockCategories: FoodReturnCategory[] = [
      {id: 11, name: 'Graue Kisten', sortOrder: 1, enabled: true},
      {id: 12, name: 'Klappkisten schwarz', sortOrder: 2, enabled: false}
    ];

    apiService.getAllFoodReturnCategories().subscribe((data: FoodReturnCategory[]) => {
      expect(data).toEqual(mockCategories);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/food-return-categories'});
    req.flush({categories: mockCategories});
    httpMock.verify();
  });

  it('create category', () => {
    const newCategory: FoodReturnCategory = {id: 0, name: 'Bananenkisten', sortOrder: 0, enabled: true};
    const createdCategory: FoodReturnCategory = {...newCategory, id: 42};

    apiService.createFoodReturnCategory(newCategory).subscribe((data: FoodReturnCategory) => {
      expect(data).toEqual(createdCategory);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/food-return-categories'});
    req.flush(createdCategory);
    httpMock.verify();
  });

  it('update category', () => {
    const updatedCategory: FoodReturnCategory = {id: 11, name: 'Graue Kisten', sortOrder: 1, enabled: false};

    apiService.updateFoodReturnCategory(11, updatedCategory).subscribe((data: FoodReturnCategory) => {
      expect(data).toEqual(updatedCategory);
    });

    const req = httpMock.expectOne({method: 'PUT', url: '/food-return-categories/11'});
    req.flush(updatedCategory);
    httpMock.verify();
  });

  it('reorder categories', () => {
    const reorderedCategories: FoodReturnCategory[] = [
      {id: 12, name: 'Klappkisten schwarz', sortOrder: 1, enabled: true},
      {id: 11, name: 'Graue Kisten', sortOrder: 2, enabled: true}
    ];

    apiService.reorderFoodReturnCategories([12, 11]).subscribe((data: FoodReturnCategory[]) => {
      expect(data).toEqual(reorderedCategories);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/food-return-categories/reorder'});
    expect(req.request.body).toEqual({categoryIds: [12, 11]});
    req.flush({categories: reorderedCategories});
    httpMock.verify();
  });

});
