import {Component, computed, effect, inject, input, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {Observable} from 'rxjs';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';

/**
 * Which shelters the route delivers to today. This is the one place a shelter is picked for a
 * distribution day: the drivers read the result in the route guidance, and the dashboard's
 * statistics card shows it read-only and freezes it onto the statistic when the day is closed - a
 * second place to choose them would only let the two drift apart.
 *
 * Saved on its own request rather than with the base data, which needs car, driver and co-driver
 * complete: the shelters are often known before the team is.
 */
@Component({
  selector: 'tafel-food-collection-recording-shelters',
  templateUrl: 'food-collection-recording-shelters.component.html',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule
  ]
})
export class FoodCollectionRecordingSheltersComponent {
  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);

  selectedRouteData = input<SelectedRouteData>();
  // the active shelters - one deactivated after it was picked stays selected without an option of its own
  shelterList = input<ShelterItem[]>([]);

  readonly shelterIds = new FormControl<number[]>([], {nonNullable: true});

  private readonly selectedIds = toSignal(this.shelterIds.valueChanges, {initialValue: this.shelterIds.value});
  private readonly savedIds = signal<number[]>([]);

  readonly hasUnsavedChanges = computed(() => !sameIds(this.selectedIds(), this.savedIds()));

  constructor() {
    // A new route, or a refreshed snapshot of the same one, starts from what the server holds.
    effect(() => {
      const ids = this.selectedRouteData()?.foodCollectionData?.shelterIds ?? [];
      this.savedIds.set(ids);
      this.shelterIds.reset(ids);
    });
  }

  /** Only when something changed - an untouched selection must not create the route's food collection. */
  saveRequest(): Observable<void> | null {
    const routeId = this.selectedRouteData()?.route.id;
    if (routeId === undefined || !this.hasUnsavedChanges()) {
      return null;
    }
    return this.foodCollectionsApiService.saveShelters(routeId, {shelterIds: this.shelterIds.value});
  }

  markAsSaved() {
    this.savedIds.set(this.shelterIds.value);
  }
}

function sameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every(id => b.includes(id));
}
