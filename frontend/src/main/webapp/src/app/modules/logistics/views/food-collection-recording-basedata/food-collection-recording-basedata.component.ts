import {Component, effect, inject, input, model, NgZone, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  ButtonDirective,
  ColComponent,
  FormSelectDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {faGauge, faRemove, faTruck} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelEmployeeSearchCreateComponent} from '../../components/tafel-employee-search-create.component';
import {EmployeeData} from '../../../../api/employee-api.service';
import {CustomValidator} from '../../../../common/validator/CustomValidator';
import {
  FoodCollectionsApiService,
  FoodCollectionSaveRouteDataRequest
} from '../../../../api/food-collections-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {CarData, CarList} from '../../../../api/car-api.service';
import {take} from 'rxjs';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';

@Component({
  selector: 'tafel-food-collection-recording-basedata',
  templateUrl: 'food-collection-recording-basedata.component.html',
  imports: [
    CommonModule,
    FormSelectDirective,
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    FormsModule,
    ButtonDirective,
    InputGroupComponent,
    FaIconComponent,
    InputGroupTextDirective,
    TafelEmployeeSearchCreateComponent
  ],
  standalone: true
})
export class FoodCollectionRecordingBasedataComponent {
  @ViewChild('driverEmployeeSearchCreate') driverEmployeeSearchCreate: TafelEmployeeSearchCreateComponent
  @ViewChild('coDriverEmployeeSearchCreate') coDriverEmployeeSearchCreate: TafelEmployeeSearchCreateComponent

  selectedRouteData = input<SelectedRouteData>();
  carList = model.required<CarList>();

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly ngZone = inject(NgZone);

  selectedDriver: EmployeeData;
  selectedCoDriver: EmployeeData;

  form = this.fb.group({
      car: this.fb.control<CarData>(null, [Validators.required]),
      driverSearchInput: this.fb.control<string>(null,
        [
          Validators.required,
          Validators.maxLength(50),
          CustomValidator.hasValue(() => this.selectedDriver, 'Bitte die Mitarbeiter-Suche starten')
        ]
      ),
      coDriverSearchInput: this.fb.control<string>(null,
        [
          Validators.required,
          Validators.maxLength(50),
          CustomValidator.hasValue(() => this.selectedCoDriver, 'Bitte die Mitarbeiter-Suche starten')
        ]
      ),
      kmStart: this.fb.control<number>(null, [Validators.required, Validators.min(1)]),
      kmEnd: this.fb.control<number>(null, [Validators.required, Validators.min(1)]),
    },
    {
      validators: [this.createKmValidation()]
    }
  );

  foodCollectionDataEffect = effect(() => {
    const foodCollectionData = this.selectedRouteData().foodCollectionData;

    // reset form without route to prevent an infinite loop
    this.car.reset();
    this.kmStart.reset();
    this.kmEnd.reset();
    this.driverSearchInput.reset();
    this.selectedDriver = null;
    this.coDriverSearchInput.reset();
    this.selectedCoDriver = null;

    if (foodCollectionData) {
      this.car.setValue(this.carList().cars.find(car => car.id === foodCollectionData.carId));

      if (foodCollectionData.driver) {
        this.driverSearchInput.setValue(foodCollectionData.driver.personnelNumber);
        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
          this.driverEmployeeSearchCreate.triggerSearch();
        });
      }
      if (foodCollectionData.coDriver) {
        this.coDriverSearchInput.setValue(foodCollectionData.coDriver.personnelNumber);
        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
          this.coDriverEmployeeSearchCreate.triggerSearch();
        });
      }

      this.kmStart.setValue(foodCollectionData.kmStart);
      this.kmEnd.setValue(foodCollectionData.kmEnd);
    }
  });

  private createKmValidation() {
    return (form: FormGroup) => {
      const kmStart = form.get('kmStart')
      const kmStartValue = kmStart.value
      const kmEnd = form.get('kmEnd')
      const kmEndValue = kmEnd.value

      if (kmStart && kmEnd && kmStartValue > 0 && kmEndValue > 0 && kmStartValue >= kmEndValue) {
        const error = {kmValidation: true};
        kmEnd.setErrors(error);
        return error;
      }

      return null;
    };
  }

  triggerSearchDriver() {
    if (this.driverSearchInput.value) {
      this.driverEmployeeSearchCreate.triggerSearch();
    }
  }

  triggerSearchCoDriver() {
    if (this.coDriverSearchInput.value) {
      this.coDriverEmployeeSearchCreate.triggerSearch();
    }
  }

  setSelectedDriver(employee: EmployeeData) {
    this.selectedDriver = employee;
    this.driverSearchInput.updateValueAndValidity()
  }

  setSelectedCoDriver(employee: EmployeeData) {
    this.selectedCoDriver = employee;
    this.coDriverSearchInput.updateValueAndValidity()
  }

  isSaveDisabled(): boolean {
    return this.form.invalid || !this.selectedDriver || !this.selectedCoDriver;
  }

  save() {
    const routeData: FoodCollectionSaveRouteDataRequest = {
      carId: this.car.value.id,
      driverId: this.selectedDriver.id,
      coDriverId: this.selectedCoDriver.id,
      kmStart: this.kmStart.value,
      kmEnd: this.kmEnd.value
    };

    this.foodCollectionsApiService.saveRouteData(this.selectedRouteData().route.id, routeData).subscribe(() => {
      this.toastService.showToast({type: ToastType.SUCCESS, title: 'Daten wurden gespeichert!'});
    });
  }

  resetDriver() {
    this.driverSearchInput.setValue(null);
    this.selectedDriver = null;
  }

  resetCoDriver() {
    this.coDriverSearchInput.setValue(null);
    this.selectedCoDriver = null;
  }

  get car() {
    return this.form.get('car');
  }

  get driverSearchInput() {
    return this.form.get('driverSearchInput');
  }

  get coDriverSearchInput() {
    return this.form.get('coDriverSearchInput');
  }

  get kmStart() {
    return this.form.get('kmStart');
  }

  get kmEnd() {
    return this.form.get('kmEnd');
  }

  protected readonly faTruck = faTruck;
  protected readonly faGauge = faGauge;
  protected readonly faRemove = faRemove;
}
