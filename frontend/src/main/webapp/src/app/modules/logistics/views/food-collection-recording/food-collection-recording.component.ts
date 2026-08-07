import {Component, computed, effect, inject, model, signal, viewChild} from '@angular/core';
import {RouteApiService, RouteData, RouteList, Shop} from '../../../../api/route-api.service';

import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatTabsModule} from '@angular/material/tabs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatIcon} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FoodReturnCategory} from '../../../../api/food-return-categories-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CarList} from '../../../../api/car-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faRoute} from '@fortawesome/free-solid-svg-icons';
import {
  FoodCollectionRecordingBasedataComponent
} from '../food-collection-recording-basedata/food-collection-recording-basedata.component';
import {
  FoodCollectionRecordingKmComponent
} from '../food-collection-recording-km/food-collection-recording-km.component';
import {
  FoodCollectionRecordingItemsDesktopComponent
} from '../food-collection-recording-items-desktop/food-collection-recording-items-desktop.component';
import {
  FoodCollectionRecordingItemsResponsiveComponent
} from '../food-collection-recording-items-responsive/food-collection-recording-items-responsive.component';
import {KmDiffDialogComponent} from '../food-collection-recording-km/dialogs/km-diff-dialog.component';
import {FoodCollectionData, FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {concat, forkJoin, map, Observable} from 'rxjs';
import {toSignal} from '@angular/core/rxjs-interop';
import {BreakpointObserver} from '@angular/cdk/layout';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

// Matches the Tailwind `md` breakpoint the two item layouts have always been switched at.
const DESKTOP_BREAKPOINT = '(min-width: 768px)';

@Component({
  selector: 'tafel-food-collection-recording',
  templateUrl: 'food-collection-recording.component.html',
  imports: [
    MatButtonModule,
    MatCardModule,
    ReactiveFormsModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIcon,
    FaIconComponent,
    FoodCollectionRecordingBasedataComponent,
    FoodCollectionRecordingKmComponent,
    FoodCollectionRecordingItemsDesktopComponent,
    FoodCollectionRecordingItemsResponsiveComponent
  ]
})
export class FoodCollectionRecordingComponent {
  routeList = model.required<RouteList>();
  carList = model.required<CarList>();
  foodCategories = model.required<FoodCategory[]>();
  foodReturnCategories = model.required<FoodReturnCategory[]>();

  selectedRoute?: RouteData;
  selectedRouteData = signal<SelectedRouteData | undefined>(undefined);

  basedataComponent = viewChild(FoodCollectionRecordingBasedataComponent);
  kmComponent = viewChild(FoodCollectionRecordingKmComponent);
  itemsDesktopComponent = viewChild(FoodCollectionRecordingItemsDesktopComponent);
  itemsResponsiveComponent = viewChild(FoodCollectionRecordingItemsResponsiveComponent);

  private readonly globalStateService = inject(GlobalStateService);
  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly routeApiService = inject(RouteApiService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  // only one of the two item layouts exists at a time, so saving cannot pick up the stale form
  // state of the layout that happens to be hidden
  readonly isDesktopLayout = toSignal(
    this.breakpointObserver.observe([DESKTOP_BREAKPOINT]).pipe(map(state => state.matches)),
    {initialValue: this.breakpointObserver.isMatched(DESKTOP_BREAKPOINT)}
  );

  saving = signal<boolean>(false);

  private readonly itemsComponent = computed(() =>
    this.isDesktopLayout() ? this.itemsDesktopComponent() : this.itemsResponsiveComponent()
  );

  constructor() {
    // Redirect to overview once it's confirmed no distribution is active. `getCurrentDistribution()`
    // is also `null` before the first SSE message arrives, so this must wait for that first message
    // to actually be processed (getHasReceivedDistribution) - not just for the socket to be open -
    // to avoid redirecting away before the real state is known (e.g. right after a page load with
    // no/poor connectivity).
    effect(() => {
      if (this.globalStateService.getHasReceivedDistribution()() && this.globalStateService.getCurrentDistribution()() === null) {
        this.router.navigate(['uebersicht']);
      }
    });
  }

  onSelectedRouteChange(route: RouteData) {
    forkJoin({
      foodCollectionData: this.foodCollectionsApiService.getFoodCollection(route.id),
      shopsOfRouteData: this.routeApiService.getShopsOfRoute(route.id)
    }).subscribe({
      next: ({foodCollectionData, shopsOfRouteData}) => {
        this.selectedRouteData.set({
          route: route,
          shops: shopsOfRouteData.shops,
          foodCollectionData: foodCollectionData
        });
      },
      error: () => {
        this.toastr.error('Fehler beim Laden der Daten!');
      }
    });
  }

  /**
   * One save for the whole screen: whichever tab is open, the base data, the mileage and the
   * recorded amounts are all sent. Parts that are incomplete are skipped rather than blocking the
   * rest - a route legitimately gets its base data at departure and its mileage on return.
   */
  save() {
    if (this.kmComponent()?.needsKmDifferenceConfirmation()) {
      this.dialog.open(KmDiffDialogComponent, {
        data: {kmDifference: this.kmComponent()!.kmDifference()}
      }).afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.saveAllSections();
        }
      });
      return;
    }

    this.saveAllSections();
  }

  private saveAllSections() {
    const basedata = this.basedataComponent();
    const km = this.kmComponent();
    const items = this.itemsComponent();

    basedata?.markAllAsTouched();
    km?.markAllAsTouched();
    items?.markAllAsTouched();

    const requests = [
      basedata?.saveRequest(),
      km?.saveRequest(),
      ...(items?.saveRequests() ?? [])
    ].filter((request): request is Observable<void> => !!request);

    const skipped = [
      basedata?.hasInvalidInput() ? 'Routendaten' : null,
      km?.hasInvalidInput() ? 'Kilometerstand' : null,
      items?.hasInvalidInput() ? 'Retourware' : null
    ].filter((section): section is string => !!section);

    if (requests.length === 0) {
      this.toastr.error('Keine vollständigen Daten zum Speichern!');
      return;
    }

    // strictly sequential, not forkJoin: every one of these endpoints creates the route's food
    // collection if it doesn't exist yet, so firing them in parallel makes two of them race on
    // that insert and violate the (distribution, route) unique constraint
    this.saving.set(true);
    concat(...requests).subscribe({
      complete: () => {
        this.saving.set(false);
        if (skipped.length > 0) {
          this.toastr.warning(`Gespeichert - unvollständig und daher nicht gespeichert: ${skipped.join(', ')}`);
        } else {
          this.toastr.success('Daten wurden gespeichert!');
        }
      },
      error: () => {
        this.saving.set(false);
        this.toastr.error('Speichern fehlgeschlagen!');
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
