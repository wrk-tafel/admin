import {Component, inject, model, OnInit, ViewChild} from '@angular/core';
import {RouteData, RouteList, Shop} from '../../../../api/route-api.service';
import {CommonModule} from '@angular/common';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent,
  TableColorDirective,
  TableDirective,
  TextColorDirective
} from '@coreui/angular';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {faGauge, faRemove, faRoute, faTruck} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelEmployeeSearchCreateComponent} from '../../components/tafel-employee-search-create.component';
import {EmployeeData} from '../../../../api/employee-api.service';
import {CustomValidator} from '../../../../common/validator/CustomValidator';
import {
  FoodCollectionData,
  FoodCollectionItem,
  FoodCollectionsApiService,
  FoodCollectionSaveRequest
} from '../../../../api/food-collections-api.service';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {firstValueFrom} from 'rxjs';
import {CarData, CarList} from '../../../../api/car-api.service';

@Component({
  selector: 'tafel-food-collection-recording',
  templateUrl: 'food-collection-recording.component.html',
  imports: [
    CommonModule,
    CardComponent,
    CardBodyComponent,
    CardHeaderComponent,
    FormSelectDirective,
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    FormsModule,
    ButtonDirective,
    InputGroupComponent,
    FaIconComponent,
    InputGroupTextDirective,
    TableDirective,
    TafelEmployeeSearchCreateComponent,
    TextColorDirective,
    CardFooterComponent,
    TableColorDirective
  ],
  standalone: true
})
export class FoodCollectionRecordingComponent implements OnInit {
  @ViewChild('driverEmployeeSearchCreate') driverEmployeeSearchCreate: TafelEmployeeSearchCreateComponent
  @ViewChild('coDriverEmployeeSearchCreate') coDriverEmployeeSearchCreate: TafelEmployeeSearchCreateComponent

  routeList = model.required<RouteList>();
  carList = model.required<CarList>();
  foodCategories = model.required<FoodCategory[]>();

  private readonly globalStateService = inject(GlobalStateService);
  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  selectedDriver: EmployeeData;
  selectedCoDriver: EmployeeData;

  form = this.fb.group({
      route: this.fb.control<RouteData>(null, [Validators.required]),
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
      categories: this.fb.array([]),
    },
    {
      validators: [this.createKmValidation()]
    }
  );

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

  ngOnInit(): void {
    if (this.globalStateService.getCurrentDistribution().value === null) {
      this.router.navigate(['uebersicht']);
    }

    this.route.valueChanges.subscribe(async (selectedRoute) => {
      if (selectedRoute) {
        this.categories.clear();
        await this.createInputs(selectedRoute);
      } else {
        this.categories.clear();
      }
    });
  }

  async createInputs(selectedRoute: RouteData) {
    const existingData = await firstValueFrom(this.foodCollectionsApiService.getFoodCollection(selectedRoute.id))

    const categories: FormGroup[] = this.foodCategories().map((category) =>
      this.fb.group({
        categoryId: this.fb.control<number>(category.id, {nonNullable: true}),
        shops: this.fb.array(
          selectedRoute.shops.map((shop) =>
            this.fb.group({
              shopId: this.fb.control<number>(shop.id, {nonNullable: true}),
              amount: this.fb.control<number>(this.getCurrentValue(existingData, category, shop), [Validators.required, Validators.min(0)]),
            })
          )
        ),
      })
    );

    categories.forEach((categoryFormGroup) => {
      this.categories.push(categoryFormGroup);
    });
  }

  private getCurrentValue(existingData: FoodCollectionData, category: FoodCategory, shop: Shop) {
    const filteredItems = existingData.items.filter(data => data.categoryId === category.id && data.shopId === shop.id);
    if (filteredItems.length === 1) {
      return filteredItems[0].amount;
    }
    return 0;
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

  saveIsDisabled(): boolean {
    return this.form.invalid || !this.selectedDriver || !this.selectedCoDriver;
  }

  save() {
    const collectionData: FoodCollectionSaveRequest = {
      routeId: this.route.value.id,
      carId: this.car.value.id,
      driverId: this.selectedDriver.id,
      coDriverId: this.selectedCoDriver.id,
      kmStart: this.kmStart.value,
      kmEnd: this.kmEnd.value,
      items: this.mapItemsFromCategories()
    };

    this.foodCollectionsApiService.saveFoodCollection(collectionData).subscribe(() => {
      this.toastService.showToast({type: ToastType.SUCCESS, title: 'Waren wurden erfasst!'});

      this.selectedDriver = null;
      this.selectedCoDriver = null;
      this.form.reset();
      this.router.navigate(['/logistik/warenerfassung']);
    });
  }

  private mapItemsFromCategories(): FoodCollectionItem[] {
    return this.categories.controls.flatMap((formGroup) => {
      const categoryId = formGroup.get('categoryId').value;
      const shops = (formGroup.get('shops') as FormArray).controls;

      return shops.map((shopGroup) => ({
        categoryId,
        shopId: shopGroup.get('shopId').value,
        amount: shopGroup.get('amount').value!,
      }));
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

  get route() {
    return this.form.get('route');
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

  get categories() {
    return this.form.get('categories') as FormArray;
  }

  getShops(categoryIndex: number): FormArray {
    return this.categories.at(categoryIndex).get('shops') as FormArray;
  }

  get routeShops(): Shop[] {
    return this.route.getRawValue().shops
  }

  protected readonly faTruck = faTruck;
  protected readonly faGauge = faGauge;
  protected readonly faRoute = faRoute;
  protected readonly faRemove = faRemove;
}
