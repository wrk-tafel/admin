import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatButton} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {ShopItem} from '../../../../../api/shop-api.service';

export interface ShopEditDialogData {
  shop?: ShopItem;
}

@Component({
  selector: 'tafel-shop-edit-dialog',
  templateUrl: 'shop-edit-dialog.component.html',
  imports: [
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButton
  ]
})
export class ShopEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShopEditDialogComponent>);
  readonly data: ShopEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly title = this.data.shop ? 'Filiale bearbeiten' : 'Filiale anlegen';

  form = this.fb.group({
    id: [this.data.shop?.id],
    number: [this.data.shop?.number ?? null, [Validators.required, Validators.min(1)]],
    name: [this.data.shop?.name ?? '', [Validators.required]],
    addressStreet: [this.data.shop?.addressStreet ?? '', [Validators.required]],
    addressPostalCode: [this.data.shop?.addressPostalCode ?? null, [Validators.required, Validators.min(1)]],
    addressCity: [this.data.shop?.addressCity ?? '', [Validators.required]],
    foodUnit: [this.data.shop?.foodUnit ?? 'BOX', [Validators.required]],
    phone: [this.data.shop?.phone ?? ''],
    contactPerson: [this.data.shop?.contactPerson ?? ''],
    note: [this.data.shop?.note ?? ''],
    enabled: [this.data.shop?.enabled ?? true]
  });

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as ShopItem);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
