import {Component, effect, inject, input, model, signal, untracked, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatIcon} from '@angular/material/icon';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {faRemove, faTruck} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
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
        FaIconComponent,
        TafelEmployeeSearchCreateComponent
    ]
})
export class FoodCollectionRecordingBasedataComponent {
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

  resetDriver() {
    this.driverSearchInput.setValue(null);
    this.selectedDriver.set(null);
  }

  resetCoDriver() {
    this.coDriverSearchInput.setValue(null);
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

  protected readonly faTruck = faTruck;
  protected readonly faRemove = faRemove;
}
