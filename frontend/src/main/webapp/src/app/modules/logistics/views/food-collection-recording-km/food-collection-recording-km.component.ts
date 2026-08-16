import {Component, computed, effect, inject, input, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {FoodCollectionSaveKmRequest, FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {Observable} from 'rxjs';
import {TabStatus} from '../../services/food-collection-tab-status';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import speedIcon from '@material-symbols/svg-400/outlined/speed.svg';

/**
 * The mileage is read off the car when it is back from the route, long after the route's base data
 * (car, driver, co-driver) has been filled in - which is why it sits on the "Waren" tab next to the
 * amounts recorded at the same moment, and not with the base data.
 *
 * Both values are optional: a food collection legitimately exists with the base data filled in and
 * no mileage yet.
 */
@Component({
  selector: 'tafel-food-collection-recording-km',
  templateUrl: 'food-collection-recording-km.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon
  ]
})
export class FoodCollectionRecordingKmComponent {
  private readonly registerIcons = registerSvgIcons({speed: speedIcon});

  static readonly KM_DIFFERENCE_WARNING_THRESHOLD = 350;

  selectedRouteData = input<SelectedRouteData>();

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
      kmStart: this.fb.control<number | null>(null, [Validators.min(1)]),
      kmEnd: this.fb.control<number | null>(null, [Validators.min(1)]),
    },
    {
      validators: [this.createKmValidation()]
    }
  );

  foodCollectionDataEffect = effect(() => {
    const foodCollectionData = this.selectedRouteData()!.foodCollectionData;

    // reset form without route to prevent an infinite loop
    this.kmStart.reset();
    this.kmEnd.reset();

    if (foodCollectionData) {
      this.kmStart.setValue(foodCollectionData.kmStart);
      this.kmEnd.setValue(foodCollectionData.kmEnd);
    }
  });

  // Recompute trigger for everything below that reads plain (non-signal) form state - setValue()
  // does not mark a control dirty, so the effect above resetting/prefilling the form never counts
  // as a user change here, only actual input does.
  private readonly formChangeTick = toSignal(this.form.valueChanges, {initialValue: null});

  // markAsSaved() below calls markAsPristine(), which - unlike setValue()/reset() - never emits
  // valueChanges, so formChangeTick alone would leave tabStatus stuck on "unsaved" until the next
  // edit. This is bumped there so tabStatus has something to react to.
  private readonly savedTick = signal(0);

  /** The route length as soon as both values make sense together, for a live "→ 42 km" hint. */
  readonly liveDistanceKm = computed(() => {
    this.formChangeTick();
    return this.kmDifference();
  });

  /** Badge shown on the "Waren" tab label - see {@link TabStatus}. */
  readonly tabStatus = computed<TabStatus | undefined>(() => {
    this.formChangeTick();
    this.savedTick();

    const hasData = !!this.kmStart.value || !!this.kmEnd.value;
    if (!hasData) {
      return undefined;
    }
    if (this.hasInvalidInput()) {
      return 'invalid';
    }
    return this.form.dirty ? 'unsaved' : 'complete';
  });

  private createKmValidation() {
    return (form: FormGroup) => {
      const kmStart = form.get('kmStart');
      const kmStartValue = kmStart?.value;
      const kmEnd = form.get('kmEnd');
      const kmEndValue = kmEnd?.value;

      if (!kmStart || !kmEnd) {
        return null;
      }

      // one of the two on its own is never a valid state to store - the route's distance can only
      // be derived from both
      if (kmStartValue > 0 && !kmEndValue) {
        const error = {kmIncomplete: true};
        kmEnd.setErrors(error);
        return error;
      }
      if (kmEndValue > 0 && !kmStartValue) {
        const error = {kmIncomplete: true};
        kmStart.setErrors(error);
        return error;
      }

      if (kmStartValue > 0 && kmEndValue > 0 && kmStartValue >= kmEndValue) {
        const error = {kmValidation: true};
        kmEnd.setErrors(error);
        return error;
      }

      return null;
    };
  }

  hasInvalidInput(): boolean {
    return this.form.invalid;
  }

  markAllAsTouched() {
    this.form.markAllAsTouched();
  }

  kmDifference(): number | null {
    if (this.form.invalid || !this.kmStart.value || !this.kmEnd.value) {
      return null;
    }
    return this.kmEnd.value - this.kmStart.value;
  }

  needsKmDifferenceConfirmation(): boolean {
    const kmDifference = this.kmDifference();
    return kmDifference !== null && kmDifference > FoodCollectionRecordingKmComponent.KM_DIFFERENCE_WARNING_THRESHOLD;
  }

  saveRequest(): Observable<void> | null {
    if (this.form.invalid || !this.kmStart.value || !this.kmEnd.value) {
      return null;
    }

    const kmData: FoodCollectionSaveKmRequest = {
      kmStart: this.kmStart.value,
      kmEnd: this.kmEnd.value
    };

    return this.foodCollectionsApiService.saveKm(this.selectedRouteData()!.route.id, kmData);
  }

  /** Called once this section's own save request has actually gone out - flips its badge back to "complete". */
  markAsSaved() {
    this.form.markAsPristine();
    this.savedTick.update(tick => tick + 1);
  }

  get kmStart() {
    return this.form.get('kmStart')!;
  }

  get kmEnd() {
    return this.form.get('kmEnd')!;
  }
}
