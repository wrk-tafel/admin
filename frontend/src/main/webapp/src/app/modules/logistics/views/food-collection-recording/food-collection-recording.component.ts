import {Component, computed, effect, inject, model, signal, viewChild} from '@angular/core';
import {RouteApiService, RouteData, RouteList, Shop} from '../../../../api/route-api.service';
import {NgClass} from '@angular/common';

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
import {UnsavedChangesDialogComponent, UnsavedChangesDialogData} from './dialogs/unsaved-changes-dialog.component';
import {FoodCollectionData, FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {catchError, concat, EMPTY, forkJoin, map, Observable, Subject, switchMap} from 'rxjs';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {BreakpointObserver} from '@angular/cdk/layout';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {combineTabStatus, TabStatus} from '../../services/food-collection-tab-status';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import routeIcon from '@material-symbols/svg-400/outlined/route-fill.svg';

// Matches the Tailwind `md` breakpoint the two item layouts have always been switched at.
const DESKTOP_BREAKPOINT = '(min-width: 768px)';

@Component({
  selector: 'tafel-food-collection-recording',
  templateUrl: 'food-collection-recording.component.html',
  imports: [
    NgClass,
    MatButtonModule,
    MatCardModule,
    ReactiveFormsModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIcon,
    FoodCollectionRecordingBasedataComponent,
    FoodCollectionRecordingKmComponent,
    FoodCollectionRecordingItemsDesktopComponent,
    FoodCollectionRecordingItemsResponsiveComponent
  ]
})
export class FoodCollectionRecordingComponent {
  private readonly registerIcons = registerSvgIcons({route: routeIcon});

  routeList = model.required<RouteList>();
  carList = model.required<CarList>();
  foodCategories = model.required<FoodCategory[]>();
  foodReturnCategories = model.required<FoodReturnCategory[]>();

  // A signal, not a plain field: `[ngModel]="selectedRoute()"` has to reliably re-render even when
  // it's reassigned from an async callback outside any DOM event Angular is tracking (e.g. the
  // unsaved-changes dialog's afterClosed(), which resolves on a timer once its close animation
  // finishes) - a plain field mutated there is not guaranteed to schedule a check in zoneless mode.
  selectedRoute = signal<RouteData | undefined>(undefined);
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

  /** Badge on the "Route" tab label - see {@link TabStatus}. */
  protected readonly routeTabStatus = computed<TabStatus | undefined>(() => this.basedataComponent()?.tabStatus());

  /** Badge on the "Waren" tab label: the worse of mileage and item amounts. */
  protected readonly warenTabStatus = computed<TabStatus | undefined>(() =>
    combineTabStatus(this.kmComponent()?.tabStatus(), this.itemsComponent()?.tabStatus())
  );

  /**
   * Amounts have already been entered on "Waren" while "Route" isn't complete yet - both are
   * legitimate on their own (base data at departure, amounts on the road), but together they are
   * worth a heads-up before Speichern skips the incomplete part rather than after.
   */
  protected readonly basedataMissingWarning = computed(() =>
    this.warenTabStatus() !== undefined && this.routeTabStatus() !== 'complete'
  );

  protected readonly hasUnsavedChanges = computed(() =>
    this.routeTabStatus() === 'unsaved' || this.warenTabStatus() === 'unsaved'
  );

  /**
   * Whether switching routes right now would actually discard something - a narrower question
   * than {@link hasUnsavedChanges}, which also reads "unsaved" whenever one of km/items is
   * `complete` and the other still has nothing entered (see `combineTabStatus`'s "one section
   * outstanding" rule) even though there is nothing dirty to lose. Km/base data are read directly
   * (real dirty state, not the combined badge) on every layout - neither has any other safeguard.
   * The mobile items layout is excluded: it already resends the outgoing shop's pending return
   * items as part of the switch itself (`sendReturnItemsOfCurrentShop`) and auto-saves Warenmenge
   * counters through the offline queue as they're typed, so nothing is actually lost there: only
   * the desktop layout's batch-save model is genuinely at risk of losing unsaved amounts here.
   */
  private readonly routeSwitchWouldDiscardChanges = computed(() =>
    this.routeTabStatus() === 'unsaved'
    || this.kmComponent()?.tabStatus() === 'unsaved'
    || (this.isDesktopLayout() && this.itemsComponent()?.tabStatus() === 'unsaved')
  );

  // Fed by onSelectedRouteChange, piped through switchMap below: a slow response for a route
  // switched away from must never overwrite what a later, faster selection already applied.
  private readonly routeSelection$ = new Subject<RouteData>();

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

    this.routeSelection$.pipe(
      switchMap(route =>
        forkJoin({
          foodCollectionData: this.foodCollectionsApiService.getFoodCollection(route.id),
          shopsOfRouteData: this.routeApiService.getShopsOfRoute(route.id)
        }).pipe(
          map(({foodCollectionData, shopsOfRouteData}) => ({route, foodCollectionData, shopsOfRouteData})),
          catchError(() => {
            this.toastr.error('Fehler beim Laden der Daten!');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed()
    ).subscribe(({route, foodCollectionData, shopsOfRouteData}) => {
      this.selectedRoute.set(route);
      this.selectedRouteData.set({
        route: route,
        shops: shopsOfRouteData.shops,
        foodCollectionData: foodCollectionData
      });
    });
  }

  /**
   * Route guard (see `logistics.routes.ts`): leaving with unsaved changes needs confirmation, since
   * closing the tab or navigating away otherwise silently drops them.
   */
  canDeactivate(): Observable<boolean> | boolean {
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    return this.dialog.open(UnsavedChangesDialogComponent).afterClosed().pipe(map(confirmed => !!confirmed));
  }

  /**
   * Switching the route rebuilds every child form from scratch, so an unconfirmed switch would
   * silently drop unsaved amounts/km/base data the same way leaving the screen does (see
   * canDeactivate) - the picker itself has no navigation to intercept, so this asks directly.
   */
  onSelectedRouteChange(route: RouteData | undefined) {
    if (!route) {
      this.selectedRoute.set(undefined);
      this.selectedRouteData.set(undefined);
      return;
    }

    if (this.routeSwitchWouldDiscardChanges()) {
      const previousRoute = this.selectedRoute();
      const data: UnsavedChangesDialogData = {
        message: 'Es gibt ungespeicherte Änderungen auf dieser Route. Beim Wechseln gehen sie verloren.',
        confirmLabel: 'Route wechseln',
      };
      this.dialog.open(UnsavedChangesDialogComponent, {data}).afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.routeSelection$.next(route);
        } else {
          // undo the dropdown's already-applied visual selection - a fresh object reference is
          // needed since the mat-select otherwise still considers the just-picked route selected
          // (writeValue is only re-run when the bound reference actually differs); compareRoute is
          // what lets that fresh reference still match the original route option by id.
          this.selectedRoute.set(previousRoute ? {...previousRoute} : undefined);
        }
      });
      return;
    }

    this.routeSelection$.next(route);
  }

  /** Lets the mat-select re-match a route by id after a revert reassigns it a fresh object reference. */
  protected compareRoute(a: RouteData | undefined, b: RouteData | undefined): boolean {
    return a?.id === b?.id;
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
      items?.hasInvalidItems() ? 'Warenmenge' : null,
      items?.hasInvalidReturnItems() ? 'Retourware' : null
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

        // only the sections that actually had a complete request sent flip their badge back to
        // "complete" - a section skipped for being incomplete stays exactly as invalid as before
        if (!basedata?.hasInvalidInput()) {
          basedata?.markAsSaved();
        }
        if (!km?.hasInvalidInput()) {
          km?.markAsSaved();
        }
        if (!items?.hasInvalidItems()) {
          items?.markItemsSaved();
        }
        if (!items?.hasInvalidReturnItems()) {
          items?.markReturnItemsSaved();
        }

        if (skipped.length > 0) {
          this.toastr.warning(`Gespeichert - unvollständig und daher nicht gespeichert: ${skipped.join(', ')}`);
        } else {
          this.toastr.success('Daten wurden gespeichert!');
          // only refresh from a save that actually persisted everything - refreshing after a
          // partial save would rebuild the skipped section's form from the server, which never
          // received its (still-invalid, still on-screen) input and would silently wipe it
          this.refreshFoodCollectionSnapshot();
        }
      },
      error: () => {
        this.saving.set(false);
        this.toastr.error('Speichern fehlgeschlagen!');
      }
    });
  }

  /**
   * Re-reads the food collection after a successful save: `selectedRouteData().foodCollectionData`
   * is otherwise only ever fetched once, on route selection, so crossing the desktop/mobile
   * breakpoint afterwards - which destroys and recreates the items component - would rebuild its
   * form from the pre-save snapshot and a second "Speichern" would overwrite the server with the
   * old values again.
   */
  private refreshFoodCollectionSnapshot() {
    const current = this.selectedRouteData();
    if (!current) {
      return;
    }

    const routeId = current.route.id;
    this.foodCollectionsApiService.getFoodCollection(routeId).subscribe(foodCollectionData => {
      // the route may have been switched away from while this request was out - the snapshot then
      // belongs to a screen that is no longer shown, so it must not be applied
      if (this.selectedRouteData()?.route.id === routeId) {
        this.selectedRouteData.update(data => data ? {...data, foodCollectionData} : data);
      }
    });
  }

}

export interface SelectedRouteData {
  route: RouteData;
  shops: Shop[];
  foodCollectionData?: FoodCollectionData;
}
