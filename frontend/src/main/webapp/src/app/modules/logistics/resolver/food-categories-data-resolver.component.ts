import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {FoodCategoriesApiService, FoodCategory} from '../../../api/food-categories-api.service';

@Injectable({
  providedIn: 'root'
})
export class FoodCategoriesDataResolver {
  private readonly foodCategoriesApiService = inject(FoodCategoriesApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<FoodCategory[]> {
    return this.foodCategoriesApiService.getFoodCategories();
  }

}
