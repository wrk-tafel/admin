import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {FoodCategoriesDataResolver} from './food-categories-data-resolver.component';
import {FoodCategoriesApiService, FoodCategory} from '../../../api/food-categories-api.service';

describe('FoodCategoriesDataResolver', () => {
  let apiService: MockedObject<FoodCategoriesApiService>;
  let resolver: FoodCategoriesDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: FoodCategoriesApiService,
          useValue: {
            getFoodCategories: vi.fn().mockName('FoodCategoriesApiService.getFoodCategories')
          }
        },
        FoodCategoriesDataResolver
      ]
    });

    apiService = TestBed.inject(FoodCategoriesApiService) as MockedObject<FoodCategoriesApiService>;
    resolver = TestBed.inject(FoodCategoriesDataResolver);
  });

  it('resolve', () => {
    const mockCategories: FoodCategory[] = [
      {id: 0, name: 'Cat 1', returnItem: false},
      {id: 1, name: 'Cat 2', returnItem: true},
    ];
    apiService.getFoodCategories.mockReturnValue(of(mockCategories));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((categories: FoodCategory[]) => {
      expect(categories).toEqual(mockCategories);
    });
  });

});
