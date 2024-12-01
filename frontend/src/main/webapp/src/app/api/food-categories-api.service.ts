import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FoodCategoriesApiService {
  private readonly http = inject(HttpClient);

  getFoodCategories(): Observable<FoodCategory[]> {
    return this.http.get<FoodCategoriesList>('/food-categories')
      .pipe(map(val => val.categories));
  }
}

export interface FoodCategoriesList {
  categories: FoodCategory[];
}

export interface FoodCategory {
  id: number;
  name: string;
}
