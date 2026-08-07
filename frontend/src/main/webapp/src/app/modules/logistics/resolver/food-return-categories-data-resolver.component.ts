import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {FoodReturnCategoriesApiService, FoodReturnCategory} from '../../../api/food-return-categories-api.service';

@Service()
export class FoodReturnCategoriesDataResolver {
  private readonly foodReturnCategoriesApiService = inject(FoodReturnCategoriesApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<FoodReturnCategory[]> {
    return this.foodReturnCategoriesApiService.getActiveFoodReturnCategories();
  }

}
