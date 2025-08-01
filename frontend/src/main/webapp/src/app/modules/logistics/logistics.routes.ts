import {Routes} from '@angular/router';
import {RouteDataResolver} from './resolver/route-data-resolver.component';
import {FoodCategoriesDataResolver} from './resolver/food-categories-data-resolver.component';
import {CarDataResolver} from './resolver/car-data-resolver.component';
import {FoodCollectionRecordingComponent} from './views/food-collection-recording/food-collection-recording.component';

export const routes: Routes = [
  {
    path: 'warenerfassung',
    component: FoodCollectionRecordingComponent,
    resolve: {
      routeList: RouteDataResolver,
      foodCategories: FoodCategoriesDataResolver,
      carList: CarDataResolver
    }
  }
];
