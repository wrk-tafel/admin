import {Routes} from '@angular/router';
import {RouteDataResolver} from './resolver/route-data-resolver.component';
import {FoodCategoriesDataResolver} from './resolver/food-categories-data-resolver.component';
import {FoodReturnCategoriesDataResolver} from './resolver/food-return-categories-data-resolver.component';
import {CarDataResolver} from './resolver/car-data-resolver.component';
import {FoodCollectionRecordingComponent} from './views/food-collection-recording/food-collection-recording.component';
import {RouteGuidanceComponent} from './views/route-guidance/route-guidance.component';

export const routes: Routes = [
  {
    path: 'routen-navi',
    title: 'Routen-Navi',
    component: RouteGuidanceComponent,
    resolve: {
      routeList: RouteDataResolver
    }
  },
  {
    path: 'warenerfassung',
    title: 'Waren-Eingabe',
    component: FoodCollectionRecordingComponent,
    resolve: {
      routeList: RouteDataResolver,
      foodCategories: FoodCategoriesDataResolver,
      foodReturnCategories: FoodReturnCategoriesDataResolver,
      carList: CarDataResolver
    }
  }
];
