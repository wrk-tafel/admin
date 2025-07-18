import {Component, inject, model, OnInit} from '@angular/core';
import {RouteApiService, RouteData, RouteList, Shop} from '../../../../api/route-api.service';
import {CommonModule} from '@angular/common';
import {
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent,
  TabDirective,
  TabPanelComponent,
  TabsComponent,
  TabsContentComponent,
  TabsListComponent
} from '@coreui/angular';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CarList} from '../../../../api/car-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faRoute} from '@fortawesome/free-solid-svg-icons';
import {
  FoodCollectionRecordingBasedataComponent
} from '../food-collection-recording-basedata/food-collection-recording-basedata.component';
import {
  FoodCollectionRecordingItemsDesktopComponent
} from '../food-collection-recording-items-desktop/food-collection-recording-items-desktop.component';
import {
  FoodCollectionRecordingItemsResponsiveComponent
} from '../food-collection-recording-items-responsive/food-collection-recording-items-responsive.component';
import {FoodCollectionData, FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'tafel-food-collection-recording',
  templateUrl: 'food-collection-recording.component.html',
  imports: [
    CommonModule,
    CardComponent,
    CardBodyComponent,
    CardHeaderComponent,
    ReactiveFormsModule,
    FormsModule,
    TabsComponent,
    TabsListComponent,
    TabDirective,
    TabsContentComponent,
    TabPanelComponent,
    RowComponent,
    ColComponent,
    FormSelectDirective,
    InputGroupComponent,
    FaIconComponent,
    InputGroupTextDirective,
    FoodCollectionRecordingBasedataComponent,
    FoodCollectionRecordingItemsDesktopComponent,
    FoodCollectionRecordingItemsResponsiveComponent,
  ],
  standalone: true
})
export class FoodCollectionRecordingComponent implements OnInit {
  routeList = model.required<RouteList>();
  carList = model.required<CarList>();
  foodCategories = model.required<FoodCategory[]>();

  selectedRoute?: RouteData;
  selectedRouteData?: SelectedRouteData;

  private readonly globalStateService = inject(GlobalStateService);
  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly routeApiService = inject(RouteApiService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.globalStateService.getCurrentDistribution().value === null) {
      this.router.navigate(['uebersicht']);
    }
  }

  onSelectedRouteChange(route: RouteData) {
    forkJoin({
      foodCollectionData: this.foodCollectionsApiService.getFoodCollection(route.id),
      shopsOfRouteData: this.routeApiService.getShopsOfRoute(route.id)
    }).subscribe({
      next: ({foodCollectionData, shopsOfRouteData}) => {
        this.selectedRouteData = {
          route: route,
          shops: shopsOfRouteData.shops,
          foodCollectionData: foodCollectionData
        };
      },
      error: (error: any) => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Fehler beim Laden der Daten!'});
      }
    });
  }

  protected readonly faRoute = faRoute;
}

export interface SelectedRouteData {
  route: RouteData;
  shops: Shop[];
  foodCollectionData?: FoodCollectionData;
}
