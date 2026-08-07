import {Component, computed, effect, inject, input, model, signal} from '@angular/core';
import {NgClass} from '@angular/common';
import {Shop} from '../../../../api/route-api.service';

import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPlus, faRemove} from '@fortawesome/free-solid-svg-icons';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  FoodCollectionItem,
  FoodCollectionReturnItem,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsRequest,
  FoodCollectionSaveReturnItemsRequest
} from '../../../../api/food-collections-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {isControlInvalid, isControlValid} from '../../../../common/util/reactive-form-helper';
import {
  duplicateDescriptionValidator,
  RETURN_ITEM_DESCRIPTION_MAX_LENGTH
} from '../../services/food-collection-return-items';
import {Observable} from 'rxjs';

@Component({
  selector: 'tafel-food-collection-recording-items-desktop',
  templateUrl: 'food-collection-recording-items-desktop.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FaIconComponent,
    NgClass
  ]
})
export class FoodCollectionRecordingItemsDesktopComponent {
  foodCategories = model.required<FoodCategory[]>();
  selectedRouteData = input<SelectedRouteData>();

  readonly foodCategoriesItems = computed(() =>
    this.foodCategories().filter(category => !category.returnItem)
  );
  readonly foodCategoriesReturn = computed(() =>
    this.foodCategories().filter(category => category.returnItem)
  );

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
      categories: this.fb.array([]),
      returnCategories: this.fb.array([]),
      returnItems: this.fb.array([]),
    }
  );

  // attached lazily rather than at construction: the validator reads `foodCategories`, which is a
  // required model input and therefore not available while the form is being built
  private attachReturnItemsValidator() {
    this.returnItems.setValidators([
      duplicateDescriptionValidator(
        () => this.foodCategoriesReturn().map(category => category.name),
        row => row.get('shopId')!.value
      )
    ]);
  }

  // Track form initialization state with signal
  private formInitialized = signal<boolean>(false);

  readonly formReady = computed(() =>
    this.formInitialized() &&
    this.selectedRouteData() !== undefined &&
    this.foodCategories().length > 0 &&
    this.categories.controls.length > 0
  );

  foodCollectionDataEffect = effect(() => {
    // reset form without route to prevent an infinite loop
    this.categories.clear();
    this.returnCategories.clear();
    this.returnItems.clear();
    this.formInitialized.set(false);

    if (this.selectedRouteData()) {
      this.attachReturnItemsValidator();

      const shops = this.selectedRouteData()!.shops;
      const items = this.selectedRouteData()!.foodCollectionData?.items ?? [];
      const returnItems = this.selectedRouteData()!.foodCollectionData?.returnItems ?? [];

      this.createCategoryShopInputs(shops, items);
      this.createReturnCategoryShopInputs(shops, returnItems);
      this.createFreetextReturnItemRows(returnItems);

      this.categories.markAllAsTouched();
      this.formInitialized.set(true);
    }
  });

  createCategoryShopInputs(shops: Shop[], items: FoodCollectionItem[] = []) {
    this.foodCategoriesItems().forEach((category) => {
      this.categories.push(
        this.fb.group({
          categoryId: this.fb.control<number>(category.id, {nonNullable: true}),
          shops: this.fb.array(
            shops.map((shop) =>
              this.fb.group({
                shopId: this.fb.control<number>(shop.id, {nonNullable: true}),
                amount: this.fb.control<number>(this.getCurrentValue(items, category, shop), [Validators.required, Validators.min(0)]),
              })
            )
          ),
        })
      );
    });
  }

  /**
   * The pre-defined return categories are only the labels of the counters here - what gets stored
   * is the category's name as a return item's description, the same shape a free-text row produces.
   */
  createReturnCategoryShopInputs(shops: Shop[], returnItems: FoodCollectionReturnItem[] = []) {
    this.foodCategoriesReturn().forEach((category) => {
      this.returnCategories.push(
        this.fb.group({
          description: this.fb.control<string>(category.name, {nonNullable: true}),
          shops: this.fb.array(
            shops.map((shop) =>
              this.fb.group({
                shopId: this.fb.control<number>(shop.id, {nonNullable: true}),
                amount: this.fb.control<number>(
                  this.getCurrentReturnValue(returnItems, category.name, shop),
                  [Validators.required, Validators.min(0)]
                ),
              })
            )
          ),
        })
      );
    });
  }

  createFreetextReturnItemRows(returnItems: FoodCollectionReturnItem[] = []) {
    const returnCategoryNames = this.foodCategoriesReturn().map(category => category.name);
    returnItems
      .filter(returnItem => !returnCategoryNames.includes(returnItem.description))
      .forEach(returnItem => this.addReturnItem(returnItem.shopId, returnItem.description, returnItem.amount));
  }

  addReturnItem(shopId?: number, description = '', amount = 1) {
    this.attachReturnItemsValidator();
    this.returnItems.push(
      this.fb.group({
        shopId: this.fb.control<number | null>(shopId ?? this.selectedRouteData()?.shops?.[0]?.id ?? null, [Validators.required]),
        description: this.fb.control<string>(description, {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(RETURN_ITEM_DESCRIPTION_MAX_LENGTH)]
        }),
        amount: this.fb.control<number>(amount, [Validators.required, Validators.min(1)]),
      })
    );
    this.returnItems.updateValueAndValidity();
  }

  removeReturnItem(index: number) {
    this.returnItems.removeAt(index);
    this.returnItems.updateValueAndValidity();
  }

  private getCurrentValue(items: FoodCollectionItem[], category: FoodCategory, shop: Shop) {
    const filteredItems = items.filter(data => data.categoryId === category.id && data.shopId === shop.id);
    if (filteredItems.length === 1) {
      return filteredItems[0].amount;
    }
    return 0;
  }

  private getCurrentReturnValue(returnItems: FoodCollectionReturnItem[], description: string, shop: Shop) {
    const filteredItems = returnItems.filter(data => data.description === description && data.shopId === shop.id);
    if (filteredItems.length === 1) {
      return filteredItems[0].amount;
    }
    return 0;
  }

  hasInvalidInput(): boolean {
    return this.form.invalid;
  }

  markAllAsTouched() {
    this.form.markAllAsTouched();
  }

  saveRequests(): Observable<void>[] {
    if (!this.selectedRouteData() || !this.formReady()) {
      return [];
    }

    const routeId = this.selectedRouteData()!.route.id;
    const itemsRequest: FoodCollectionSaveItemsRequest = {
      items: this.mapItemsFromCategories()
    };
    const requests = [this.foodCollectionsApiService.saveItems(routeId, itemsRequest)];

    if (this.returnItems.valid) {
      const returnItemsRequest: FoodCollectionSaveReturnItemsRequest = {
        returnItems: this.mapReturnItems()
      };
      requests.push(this.foodCollectionsApiService.saveReturnItems(routeId, returnItemsRequest));
    }

    return requests;
  }

  private mapItemsFromCategories(): FoodCollectionItem[] {
    return this.categories.controls.flatMap((formGroup) => {
      const categoryId = formGroup.get('categoryId')!.value;
      const shops = (formGroup.get('shops') as FormArray).controls;

      return shops.map((shopGroup) => ({
        categoryId,
        shopId: shopGroup.get('shopId')!.value,
        amount: shopGroup.get('amount')!.value,
      }));
    });
  }

  private mapReturnItems(): FoodCollectionReturnItem[] {
    const fromCategories = this.returnCategories.controls.flatMap((formGroup) => {
      const description = formGroup.get('description')!.value;
      const shops = (formGroup.get('shops') as FormArray).controls;

      return shops.map((shopGroup) => ({
        shopId: shopGroup.get('shopId')!.value,
        description,
        amount: shopGroup.get('amount')!.value,
      }));
    });

    const freetext = this.returnItems.controls.map((formGroup) => ({
      shopId: formGroup.get('shopId')!.value,
      description: formGroup.get('description')!.value,
      amount: formGroup.get('amount')!.value,
    }));

    return [...fromCategories, ...freetext].filter(returnItem => returnItem.amount > 0);
  }

  get categories() {
    return this.form.get('categories') as FormArray;
  }

  get returnCategories() {
    return this.form.get('returnCategories') as FormArray;
  }

  get returnItems() {
    return this.form.get('returnItems') as FormArray;
  }

  getShops(categoryIndex: number): FormArray {
    return this.categories.at(categoryIndex).get('shops') as FormArray;
  }

  getReturnCategoryShops(categoryIndex: number): FormArray {
    return this.returnCategories.at(categoryIndex).get('shops') as FormArray;
  }

  getReturnItemGroup(index: number): FormGroup {
    return this.returnItems.at(index) as FormGroup;
  }

  protected readonly isControlInvalid = isControlInvalid;
  protected readonly isControlValid = isControlValid;
  protected readonly faPlus = faPlus;
  protected readonly faRemove = faRemove;
  protected readonly maxDescriptionLength = RETURN_ITEM_DESCRIPTION_MAX_LENGTH;
}
