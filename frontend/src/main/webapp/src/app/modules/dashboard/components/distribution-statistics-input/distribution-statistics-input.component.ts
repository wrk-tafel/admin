import {Component, effect, inject, input, signal} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  ColComponent,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {SelectSheltersComponent} from '../select-shelters/select-shelters.component';
import {ShelterItem, ShelterListResponse} from '../../../../api/shelter-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-distribution-statistics-input',
  templateUrl: 'distribution-statistics-input.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ButtonDirective,
    ReactiveFormsModule,
    CommonModule,
    CardFooterComponent,
    InputGroupComponent,
    InputGroupTextDirective,
    SelectSheltersComponent
  ]
})
export class DistributionStatisticsInputComponent {
  private readonly fb = inject(FormBuilder);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastService = inject(ToastService);
  private readonly globalStateService = inject(GlobalStateService);

  sheltersData = input<ShelterListResponse>();
  employeeCountInput = input<number>();
  initialSelectedShelterNames = input<string[]>([]);
  initialIdsProcessed = signal<boolean>(false);

  form = this.fb.group({
    employeeCount: this.fb.control<number>(null, [Validators.required, Validators.min(1)]),
    personsInShelterCount: this.fb.control<number>({
      value: null,
      disabled: true
    }, [Validators.required, Validators.min(1)]),
  })

  readonly distribution = this.globalStateService.getCurrentDistribution();
  panelDisabled = signal<boolean>(true);
  selectedShelters = signal<ShelterItem[]>([]);

  distributionEffect = effect(() => {
    const distribution = this.distribution();
    if (distribution) {
      this.employeeCount.enable();
      this.panelDisabled.set(false);
    } else {
      this.employeeCount.disable();
      this.panelDisabled.set(true);

      // reset form
      this.employeeCount.reset();
      this.personsInShelterCount.reset();
      this.selectedShelters.set([]);
    }
  });

  initialSelectedShelterIdsEffect = effect(() => {
    const initialSelectedShelterIds = this.initialSelectedShelterNames() ?? [];
    if (!this.initialIdsProcessed() && initialSelectedShelterIds.length > 0) {
      const shelters = initialSelectedShelterIds.map(name => this.sheltersData()?.shelters?.find(shelter => shelter.name === name));
      this.selectedShelters.set(shelters);
      this.calculatePersonsInShelterCount();

      this.initialIdsProcessed.set(true);
    }
  });

  employeeCountInputEffect = effect(() => {
    const employeeCount = this.employeeCountInput();
    this.form.patchValue({'employeeCount': employeeCount});
  });

  onUpdateSelectedShelters(selectedShelters: ShelterItem[]) {
    this.selectedShelters.set(selectedShelters);
    this.calculatePersonsInShelterCount();
  }

  calculatePersonsInShelterCount() {
    const countPersons = this.selectedShelters()
      .filter(shelter => shelter)
      .map(shelter => shelter.personsCount)
      .reduce((a, b) => a + b, 0);
    const personsInShelterCount = countPersons > 0 ? countPersons : null;
    this.form.patchValue({'personsInShelterCount': personsInShelterCount});
  }

  save() {
    const observer = {
      next: () => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Statistik-Daten gespeichert!'});
      },
      error: error => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
      },
    };

    const selectedShelterIds = this.selectedShelters().map(shelter => shelter.id);
    this.distributionApiService.saveStatistic(this.employeeCount.value, selectedShelterIds).subscribe(observer);
  }

  get employeeCount() {
    return this.form.get('employeeCount');
  }

  get personsInShelterCount() {
    return this.form.get('personsInShelterCount');
  }

  isSaveDisabled() {
    return !this.form.valid;
  }
}
