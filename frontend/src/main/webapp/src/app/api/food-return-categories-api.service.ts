import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Service()
export class FoodReturnCategoriesApiService {
  private readonly http = inject(HttpClient);

  getActiveFoodReturnCategories(): Observable<FoodReturnCategory[]> {
    return this.http.get<FoodReturnCategoriesList>('/food-return-categories/active')
      .pipe(map(val => val.categories));
  }

  getAllFoodReturnCategories(): Observable<FoodReturnCategory[]> {
    return this.http.get<FoodReturnCategoriesList>('/food-return-categories')
      .pipe(map(val => val.categories));
  }

  createFoodReturnCategory(category: FoodReturnCategory): Observable<FoodReturnCategory> {
    return this.http.post<FoodReturnCategory>('/food-return-categories', category);
  }

  updateFoodReturnCategory(categoryId: number, category: FoodReturnCategory): Observable<FoodReturnCategory> {
    return this.http.put<FoodReturnCategory>(`/food-return-categories/${categoryId}`, category);
  }

  reorderFoodReturnCategories(categoryIds: number[]): Observable<FoodReturnCategory[]> {
    return this.http.post<FoodReturnCategoriesList>('/food-return-categories/reorder', {categoryIds})
      .pipe(map(val => val.categories));
  }
}

export interface FoodReturnCategoriesList {
  categories: FoodReturnCategory[];
}

export interface FoodReturnCategory {
  id: number;
  name: string;
  sortOrder: number;
  enabled: boolean;
}
