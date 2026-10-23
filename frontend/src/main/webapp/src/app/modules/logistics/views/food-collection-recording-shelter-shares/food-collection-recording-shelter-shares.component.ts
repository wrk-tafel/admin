import {Component, computed, inject, input} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {catchError, of, switchMap} from 'rxjs';
import {FoodCollectionsApiService, ShelterShareRoute} from '../../../../api/food-collections-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {formatEstimatedShare} from '../../../../common/util/shelter-kitchen.util';

/**
 * How much of what this route collected goes to the shelters it delivers to today - an estimate,
 * recalculated whenever the route is (re)loaded or saved. Rendered only for a route with shelters:
 * everything else stays with the households anyway.
 */
@Component({
  selector: 'tafel-food-collection-recording-shelter-shares',
  templateUrl: 'food-collection-recording-shelter-shares.component.html'
})
export class FoodCollectionRecordingShelterSharesComponent {
  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);

  selectedRouteData = input<SelectedRouteData>();
  // changes with every completed save - what was collected may have changed with it
  refreshKey = input<number>(0);

  private readonly request = computed(() => ({data: this.selectedRouteData(), refresh: this.refreshKey()}));

  // a route change, a new snapshot of its food collection or a save asks again
  private readonly shares = toSignal(
    toObservable(this.request).pipe(
      switchMap(({data}) => data?.foodCollectionData?.shelterIds?.length
        ? this.foodCollectionsApiService.getShelterShares().pipe(catchError(() => of(null)))
        : of(null))
    ),
    {initialValue: null}
  );

  protected readonly route = computed<ShelterShareRoute | undefined>(() =>
    this.shares()?.routes.find(route => route.routeId === this.selectedRouteData()?.route.id)
  );

  protected readonly householdPersons = computed(() => this.shares()?.householdPersons ?? 0);

  protected shareLabel(items: {foodCategory: string; boxes: number}[]): string {
    return items.length ? formatEstimatedShare(items) : 'nichts aus dieser Route';
  }
}
