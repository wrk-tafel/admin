import {Component, effect, inject, input, OnInit, signal} from '@angular/core';
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
export class DistributionStatisticsInputComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastService = inject(ToastService);
  private readonly globalStateService = inject(GlobalStateService);

  sheltersData = input<ShelterListResponse>();
  employeeCountInput = input<number>();
  initialSelectedShelterNames = input<string[]>([]);
  initialIdsProcessed = false;

  form = this.fb.group({
    employeeCount: this.fb.control<number>(null, [Validators.required, Validators.min(1)]),
    personsInShelterCount: this.fb.control<number>({
      value: null,
      disabled: true
    }, [Validators.required, Validators.min(1)]),
  })

  panelDisabled = signal<boolean>(true);
  selectedShelters: ShelterItem[] = [];

  ngOnInit(): void {
    this.globalStateService.getCurrentDistribution().subscribe(distribution => {
      if (distribution) {
        this.employeeCount.enable();
        this.panelDisabled.set(false);
      } else {
        this.employeeCount.disable();
        this.panelDisabled.set(true);

        // reset form
        this.employeeCount.reset();
        this.personsInShelterCount.reset();
        this.selectedShelters = [];
      }
    });
  }

  initialSelectedShelterIdsEffect = effect(() => {
    const initialSelectedShelterIds = this.initialSelectedShelterNames() ?? [];
    if (!this.initialIdsProcessed && initialSelectedShelterIds.length > 0) {
      this.selectedShelters = initialSelectedShelterIds.map(name => this.sheltersData().shelters.find(shelter => shelter.name === name));
      this.calculatePersonsInShelterCount();

      this.initialIdsProcessed = true;
    }
  });

  employeeCountInputEffect = effect(() => {
    const employeeCount = this.employeeCountInput();
    this.form.patchValue({'employeeCount': employeeCount});
  });

  onUpdateSelectedShelters(selectedShelters: ShelterItem[]) {
    this.selectedShelters = selectedShelters;
    this.calculatePersonsInShelterCount();
  }

  calculatePersonsInShelterCount() {
    const countPersons = this.selectedShelters.map(shelter => shelter.personsCount).reduce((a, b) => a + b, 0);
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

    const selectedShelterIds = this.selectedShelters.map(shelter => shelter.id);
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
