import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {FoodReturnCategoriesDataResolver} from './food-return-categories-data-resolver.component';
import {FoodReturnCategoriesApiService, FoodReturnCategory} from '../../../api/food-return-categories-api.service';

describe('FoodReturnCategoriesDataResolver', () => {
  let apiService: MockedObject<FoodReturnCategoriesApiService>;
  let resolver: FoodReturnCategoriesDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: FoodReturnCategoriesApiService,
          useValue: {
            getActiveFoodReturnCategories: vi.fn().mockName('FoodReturnCategoriesApiService.getActiveFoodReturnCategories')
          }
        },
        FoodReturnCategoriesDataResolver
      ]
    });

    apiService = TestBed.inject(FoodReturnCategoriesApiService) as MockedObject<FoodReturnCategoriesApiService>;
    resolver = TestBed.inject(FoodReturnCategoriesDataResolver);
  });

  it('resolve', () => {
    const mockCategories: FoodReturnCategory[] = [
      {id: 11, name: 'Graue Kisten', sortOrder: 1, enabled: true},
      {id: 12, name: 'Klappkisten schwarz', sortOrder: 2, enabled: true},
    ];
    apiService.getActiveFoodReturnCategories.mockReturnValue(of(mockCategories));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((categories: FoodReturnCategory[]) => {
      expect(categories).toEqual(mockCategories);
    });
  });

});
