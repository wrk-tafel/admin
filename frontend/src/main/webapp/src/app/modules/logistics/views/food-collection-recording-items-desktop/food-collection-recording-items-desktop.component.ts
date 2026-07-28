import {Component, computed, effect, inject, input, model, signal} from '@angular/core';
import {NgClass} from '@angular/common';
import {Shop} from '../../../../api/route-api.service';

import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  FoodCollectionItem,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsRequest
} from '../../../../api/food-collections-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {isControlInvalid, isControlValid} from '../../../../common/util/reactive-form-helper';

@Component({
  selector: 'tafel-food-collection-recording-items-desktop',
  templateUrl: 'food-collection-recording-items-desktop.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NgClass
  ]
})
export class FoodCollectionRecordingItemsDesktopComponent {
  foodCategories = model.required<FoodCategory[]>();
  selectedRouteData = input<SelectedRouteData>();

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
      categories: this.fb.array([]),
    }
  );

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
    this.formInitialized.set(false);

    if (this.selectedRouteData()) {
      this.createCategoryShopInputs(this.selectedRouteData()!.shops, this.selectedRouteData()!.foodCollectionData?.items ?? []);
      this.categories.markAllAsTouched();
      this.formInitialized.set(true);
    }
  });

  createCategoryShopInputs(shops: Shop[], items: FoodCollectionItem[] = []) {
    const categories: FormGroup[] = this.foodCategories().map((category) =>
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

    categories.forEach((categoryFormGroup) => {
      this.categories.push(categoryFormGroup);
    });
  }

  private getCurrentValue(items: FoodCollectionItem[], category: FoodCategory, shop: Shop) {
    const filteredItems = items.filter(data => data.categoryId === category.id && data.shopId === shop.id);
    if (filteredItems.length === 1) {
      return filteredItems[0].amount;
    }
    return 0;
  }

  save() {
    if (!this.selectedRouteData()) {
      return;
    }

    const routeId = this.selectedRouteData()!.route.id;
    const collectionData: FoodCollectionSaveItemsRequest = {
      items: this.mapItemsFromCategories()
    };

    this.foodCollectionsApiService.saveItems(routeId, collectionData).subscribe(() => {
      this.toastr.success('Daten wurden gespeichert!');
    });
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

  get categories() {
    return this.form.get('categories') as FormArray;
  }

  getShops(categoryIndex: number): FormArray {
    return this.categories.at(categoryIndex).get('shops') as FormArray;
  }

  protected readonly isControlInvalid = isControlInvalid;
  protected readonly isControlValid = isControlValid;

}
