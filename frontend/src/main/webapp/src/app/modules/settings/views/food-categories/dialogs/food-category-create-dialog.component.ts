import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {FoodCategory} from '../../../../../api/food-categories-api.service';

@Component({
  selector: 'tafel-food-category-create-dialog',
  templateUrl: 'food-category-create-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton
  ]
})
export class FoodCategoryCreateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<FoodCategoryCreateDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required]],
    weightPerUnit: [null as number | null, [Validators.required]],
    // Not user-editable here - the backend auto-assigns the actual sort order on create,
    // placing new categories last; reordering afterwards happens via drag-and-drop.
    sortOrder: [0],
    enabled: [true]
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
