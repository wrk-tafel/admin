import {Component, effect, inject, input, linkedSignal, Signal, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatError, MatFormField, MatLabel} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ToastrService} from 'ngx-toastr';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {SelectSheltersComponent} from '../select-shelters/select-shelters.component';
import {ShelterItem, ShelterListResponse} from '../../../../api/shelter-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {DistributionItem} from '../../../../api/distribution-api.service';

@Component({
  selector: 'tafel-distribution-statistics-input',
  templateUrl: 'distribution-statistics-input.component.html',
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
    CommonModule,
    FormsModule,
    SelectSheltersComponent,
    MatError,
    MatLabel
  ]
})
export class DistributionStatisticsInputComponent {
  private readonly fb = inject(FormBuilder);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastr = inject(ToastrService);
  private readonly globalStateService = inject(GlobalStateService);

  sheltersData = input<ShelterListResponse>();
  employeeCountInput = input<number>();
  initialSelectedShelterNames = input<string[]>([]);
  initialIdsProcessed = signal<boolean>(false);

  form = this.fb.group({
    employeeCount: this.fb.control<number>(null, [Validators.required, Validators.min(1)]),
    personsInShelterCount: this.fb.control<number>(null, [Validators.min(1)]),
  });

  readonly distribution: Signal<DistributionItem | null> = this.globalStateService.getCurrentDistribution();

  // Panel disabled state derived from distribution - recomputes when distribution changes
  readonly panelDisabled = linkedSignal(() => !this.distribution());

  selectedShelters = signal<ShelterItem[]>([]);

  distributionEffect = effect(() => {
    const distribution = this.distribution();
    if (distribution) {
      this.employeeCount.enable();
      this.personsInShelterCount.enable();
    } else {
      this.employeeCount.disable();
      this.personsInShelterCount.disable();

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
        this.toastr.success('Statistik-Daten gespeichert!');
      },
      error: error => {
        this.toastr.error('Speichern fehlgeschlagen!');
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

}
