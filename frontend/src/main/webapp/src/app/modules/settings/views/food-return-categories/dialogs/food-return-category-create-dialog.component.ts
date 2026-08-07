import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {FoodReturnCategory} from '../../../../../api/food-return-categories-api.service';

@Component({
  selector: 'tafel-food-return-category-create-dialog',
  templateUrl: 'food-return-category-create-dialog.component.html',
  imports: [
    CommonModule,
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton
  ]
})
export class FoodReturnCategoryCreateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<FoodReturnCategoryCreateDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    // Not user-editable here - the backend auto-assigns the actual sort order on create,
    // placing new categories last; reordering afterwards happens via drag-and-drop.
    sortOrder: [0],
    enabled: [true]
  });

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as FoodReturnCategory);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
