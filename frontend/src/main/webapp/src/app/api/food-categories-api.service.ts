import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Service()
export class FoodCategoriesApiService {
  private readonly http = inject(HttpClient);

  getActiveFoodCategories(): Observable<FoodCategory[]> {
    return this.http.get<FoodCategoriesList>('/food-categories/active')
      .pipe(map(val => val.categories));
  }

  getAllFoodCategories(): Observable<FoodCategory[]> {
    return this.http.get<FoodCategoriesList>('/food-categories')
      .pipe(map(val => val.categories));
  }

  createFoodCategory(category: FoodCategory): Observable<FoodCategory> {
    return this.http.post<FoodCategory>('/food-categories', category);
  }

  updateFoodCategory(categoryId: number, category: FoodCategory): Observable<FoodCategory> {
    return this.http.post<FoodCategory>(`/food-categories/${categoryId}`, category);
  }

  reorderFoodCategories(categoryIds: number[]): Observable<FoodCategory[]> {
    return this.http.post<FoodCategoriesList>('/food-categories/reorder', {categoryIds})
      .pipe(map(val => val.categories));
  }
}

export interface FoodCategoriesList {
  categories: FoodCategory[];
}

export interface FoodCategory {
  id: number;
  name: string;
  weightPerUnit: number | null;
  returnItem: boolean;
  sortOrder: number;
  enabled: boolean;
}
