import {Component, computed, effect, inject, input, linkedSignal, Signal} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {catchError, debounceTime, of, switchMap} from 'rxjs';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatError, MatFormField, MatLabel} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {DashboardStatisticsShelter} from '../../dashboard.component';

@Component({
  selector: 'tafel-distribution-statistics-input',
  templateUrl: 'distribution-statistics-input.component.html',
  styleUrl: 'distribution-statistics-input.component.scss',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatInput,
    MatButton,
    MatCardFooter,
    ReactiveFormsModule,
    MatError,
    MatLabel,
    TafelInfoTooltipComponent
  ]
})
export class DistributionStatisticsInputComponent {
  private readonly fb = inject(FormBuilder);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly globalStateService = inject(GlobalStateService);

  employeeCountInput = input<number>();
  /**
   * The shelters today's routes deliver to. Picked in the food collection recording only - this
   * card shows them, it does not choose them, so the statistic can never disagree with what the
   * routes were told.
   */
  shelters = input<DashboardStatisticsShelter[]>([]);
  // the dashboard's live data - any change to it (a recorded amount, a registration) can change the
  // estimate below, so it is what asks again
  refreshKey = input<unknown>();

  form = this.fb.group({
    employeeCount: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  readonly distribution: Signal<DistributionItem | null> = this.globalStateService.getCurrentDistribution();

  // Panel disabled state derived from distribution - recomputes when distribution changes
  readonly panelDisabled = linkedSignal(() => !this.distribution());

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);

  private readonly shareRequest = computed(() => ({
    active: !!this.distribution() && this.shelters().length > 0,
    refresh: this.refreshKey()
  }));

  /**
   * How much of what the routes collected goes to the shelters, in whole boxes - the same estimate
   * Routen-Navi and the Routenerfassung show per shelter. Debounced: a busy distribution pushes the
   * dashboard several times a second, and the estimate needs no more than the latest of them.
   */
  readonly shelterShares = toSignal(
    toObservable(this.shareRequest).pipe(
      debounceTime(300),
      switchMap(({active}) => active
        ? this.foodCollectionsApiService.getShelterShares().pipe(catchError(() => of(null)))
        : of(null)),
    ),
    {initialValue: null}
  );

  readonly personsInShelterCount = computed(() =>
    this.shelters().reduce((sum, shelter) => sum + shelter.personsCount, 0)
  );

  // The control gets its disabled state from here, never from a [disabled] binding in the
  // template: on a `formControlName` that binding is what Angular warns about, since the reactive
  // control is the single source of truth for it.
  distributionEffect = effect(() => {
    const distribution = this.distribution();
    if (distribution) {
      this.employeeCount.enable();
    } else {
      this.employeeCount.disable();
      this.employeeCount.reset();
    }
  });

  employeeCountInputEffect = effect(() => {
    const employeeCount = this.employeeCountInput();
    // A live update of the dashboard can land while the user is still typing; it must not wipe
    // what they entered. The field takes the server's value again once it is saved (pristine).
    if (!this.employeeCount.dirty) {
      this.form.patchValue({'employeeCount': employeeCount});
    }
  });

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const observer = {
      next: () => {
        this.employeeCount.markAsPristine();
        this.toastr.success('Statistik-Daten gespeichert!');
      },
      error: () => {
        this.toastr.error('Speichern fehlgeschlagen!');
      },
    };

    this.distributionApiService.saveStatistic(this.employeeCount.value!).subscribe(observer);
  }

  get employeeCount() {
    return this.form.get('employeeCount')!;
  }

}
