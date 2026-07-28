import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {FoodCategory} from '../../../../../api/food-categories-api.service';

export interface FoodCategoryEditDialogData {
  category: FoodCategory;
}

@Component({
  selector: 'tafel-food-category-edit-dialog',
  templateUrl: 'food-category-edit-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButton
  ]
})
export class FoodCategoryEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<FoodCategoryEditDialogComponent>);
  readonly data: FoodCategoryEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    id: [this.data.category?.id, []],
    name: [this.data.category?.name ?? '', [Validators.required]],
    weightPerUnit: [this.data.category?.weightPerUnit ?? null, [Validators.required]],
    returnItem: [this.data.category?.returnItem ?? false],
    sortOrder: [this.data.category?.sortOrder ?? 0, [Validators.required]],
    enabled: [this.data.category?.enabled ?? true]
  });

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as FoodCategory);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
