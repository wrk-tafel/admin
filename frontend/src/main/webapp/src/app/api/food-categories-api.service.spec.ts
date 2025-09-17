import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient} from '@angular/common/http';
import {FoodCategoriesApiService, FoodCategory} from './food-categories-api.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('FoodCategoriesApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: FoodCategoriesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        FoodCategoriesApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(FoodCategoriesApiService);
  });

  it('get categories', () => {
    const mockCategories: FoodCategory[] = [
      {id: 0, name: 'Bakery', returnItem: false},
      {id: 1, name: 'Frozen Food', returnItem: true}
    ];

    apiService.getFoodCategories().subscribe((data: FoodCategory[]) => {
      expect(data).toEqual(mockCategories);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/food-categories'});
    req.flush({categories: mockCategories});
    httpMock.verify();
  });

});
