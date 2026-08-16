import {Component, computed, effect, inject, input, model, signal, untracked, viewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatIcon} from '@angular/material/icon';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import closeIcon from '@material-symbols/svg-400/outlined/close.svg';
import localShippingIcon from '@material-symbols/svg-400/outlined/local_shipping.svg';
import {
  TafelEmployeeSearchCreateComponent
} from '../../../../common/components/employee-search-create/tafel-employee-search-create.component';
import {EmployeeData} from '../../../../api/employee-api.service';
import {CustomValidator} from '../../../../common/validator/CustomValidator';
import {
  FoodCollectionsApiService,
  FoodCollectionSaveRouteDataRequest
} from '../../../../api/food-collections-api.service';
import {CarData, CarList} from '../../../../api/car-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {Observable} from 'rxjs';
import {TabStatus} from '../../services/food-collection-tab-status';

@Component({
    selector: 'tafel-food-collection-recording-basedata',
    templateUrl: 'food-collection-recording-basedata.component.html',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIcon,
        TafelEmployeeSearchCreateComponent
    ]
})
export class FoodCollectionRecordingBasedataComponent {
  private readonly registerIcons = registerSvgIcons({close: closeIcon, local_shipping: localShippingIcon});

  driverEmployeeSearchCreate = viewChild<TafelEmployeeSearchCreateComponent>('driverEmployeeSearchCreate');
  coDriverEmployeeSearchCreate = viewChild<TafelEmployeeSearchCreateComponent>('coDriverEmployeeSearchCreate');

  selectedRouteData = input<SelectedRouteData>();
  carList = model.required<CarList>();

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly fb = inject(FormBuilder);

  selectedDriver = signal<EmployeeData | null>(null);
  selectedCoDriver = signal<EmployeeData | null>(null);

  form = this.fb.group({
    car: this.fb.control<CarData | null>(null, [Validators.required]),
    driverSearchInput: this.fb.control<string | null>(null,
      [
        Validators.required,
        Validators.maxLength(50),
        CustomValidator.hasValue(() => this.selectedDriver(), 'Bitte die Mitarbeiter-Suche starten')
      ]
    ),
    coDriverSearchInput: this.fb.control<string | null>(null,
      [
        Validators.required,
        Validators.maxLength(50),
        CustomValidator.hasValue(() => this.selectedCoDriver(), 'Bitte die Mitarbeiter-Suche starten')
      ]
    ),
  });

  foodCollectionDataEffect = effect(() => {
    const foodCollectionData = this.selectedRouteData()!.foodCollectionData;
    const cars = this.carList().cars;

    // The writes below run the search inputs' validators, which read the selectedDriver /
    // selectedCoDriver signals - untracked keeps those reads out of this effect's dependencies so
    // filling the form in here cannot schedule the effect again.
    untracked(() => {
      // reset form without route to prevent an infinite loop
      this.car.reset();
      this.driverSearchInput.reset();
      this.selectedDriver.set(null);
      this.coDriverSearchInput.reset();
      this.selectedCoDriver.set(null);

      if (foodCollectionData) {
        this.car.setValue(cars.find(car => car.id === foodCollectionData.carId) ?? null);

        // A stored driver/co-driver is already a resolved employee, so it is applied directly.
        // Re-running the employee search on its personnel number would pop the select or create
        // dialog open the moment the route is picked, because that search matches substrings of
        // personnel numbers and names and so can return several employees - or none, once an
        // employee has been renamed.
        if (foodCollectionData.driver) {
          this.driverSearchInput.setValue(foodCollectionData.driver.personnelNumber);
          this.setSelectedDriver(foodCollectionData.driver);
        }
        if (foodCollectionData.coDriver) {
          this.coDriverSearchInput.setValue(foodCollectionData.coDriver.personnelNumber);
          this.setSelectedCoDriver(foodCollectionData.coDriver);
        }
      }
    });
  });

  // Recompute trigger for the plain (non-signal) form state read below - setValue() does not mark
  // a control dirty, so the effect above resetting/prefilling the form never counts as a user
  // change here, only actual input does.
  private readonly formChangeTick = toSignal(this.form.valueChanges, {initialValue: null});

  // markAsSaved() below calls markAsPristine(), which never emits valueChanges, so formChangeTick
  // alone would leave tabStatus stuck on "unsaved" until the next edit - bumped there instead.
  private readonly savedTick = signal(0);

  /** Badge shown on the "Route" tab label - see {@link TabStatus}. */
  readonly tabStatus = computed<TabStatus | undefined>(() => {
    this.formChangeTick();
    this.savedTick();

    const hasData = !!this.car.value || !!this.selectedDriver() || !!this.selectedCoDriver()
      || !!this.driverSearchInput.value || !!this.coDriverSearchInput.value;
    if (!hasData) {
      return undefined;
    }
    if (this.hasInvalidInput()) {
      return 'invalid';
    }
    return this.form.dirty ? 'unsaved' : 'complete';
  });

  triggerSearchDriver() {
    const driverSearch = this.driverEmployeeSearchCreate();
    if (this.driverSearchInput.value && driverSearch) {
      driverSearch.triggerSearch();
    }
  }

  triggerSearchCoDriver() {
    const coDriverSearch = this.coDriverEmployeeSearchCreate();
    if (this.coDriverSearchInput.value && coDriverSearch) {
      coDriverSearch.triggerSearch();
    }
  }

  setSelectedDriver(employee: EmployeeData) {
    this.selectedDriver.set(employee);
    this.driverSearchInput.updateValueAndValidity();
  }

  setSelectedCoDriver(employee: EmployeeData) {
    this.selectedCoDriver.set(employee);
    this.coDriverSearchInput.updateValueAndValidity();
  }

  hasInvalidInput(): boolean {
    return this.form.invalid || !this.selectedDriver() || !this.selectedCoDriver();
  }

  markAllAsTouched() {
    this.form.markAllAsTouched();
  }

  /**
   * The route's base data is only sent once it is complete - unlike km and item amounts it has no
   * meaningful partial state, and the endpoint requires all three references.
   */
  saveRequest(): Observable<void> | null {
    if (this.hasInvalidInput()) {
      return null;
    }

    const routeData: FoodCollectionSaveRouteDataRequest = {
      carId: this.car.value!.id,
      driverId: this.selectedDriver()!.id,
      coDriverId: this.selectedCoDriver()!.id
    };

    return this.foodCollectionsApiService.saveRouteData(this.selectedRouteData()!.route.id, routeData);
  }

  /** Called once this section's own save request has actually gone out - flips its badge back to "complete". */
  markAsSaved() {
    this.form.markAsPristine();
    this.savedTick.update(tick => tick + 1);
  }

  resetDriver() {
    this.driverSearchInput.setValue(null);
    // setValue() alone doesn't mark the control dirty (only real user input through the template
    // does) - this button click is itself a user change, so tabStatus must see it as one too.
    this.driverSearchInput.markAsDirty();
    this.selectedDriver.set(null);
  }

  resetCoDriver() {
    this.coDriverSearchInput.setValue(null);
    this.coDriverSearchInput.markAsDirty();
    this.selectedCoDriver.set(null);
  }

  get car() {
    return this.form.get('car')!;
  }

  get driverSearchInput() {
    return this.form.get('driverSearchInput')!;
  }

  get coDriverSearchInput() {
    return this.form.get('coDriverSearchInput')!;
  }

  compareCar(a: CarData | null, b: CarData | null): boolean {
    return a?.id === b?.id;
  }

}
