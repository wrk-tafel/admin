import {ChangeDetectorRef, Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormArray, FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPlus, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {RouteData, RouteStopData} from '../../../../../api/route-api.service';
import {ShopItem} from '../../../../../api/shop-api.service';

export interface RouteEditDialogData {
  route?: RouteData;
  shops: ShopItem[];
}

@Component({
  selector: 'tafel-route-edit-dialog',
  templateUrl: 'route-edit-dialog.component.html',
  imports: [
    TafelDialogComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButton,
    MatTooltip,
    FaIconComponent
  ]
})
export class RouteEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RouteEditDialogComponent>);
  readonly data: RouteEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);

  protected readonly title = this.data.route ? 'Route bearbeiten' : 'Route anlegen';
  protected readonly shops = this.data.shops;

  form = this.fb.group({
    id: [this.data.route?.id],
    number: [this.data.route?.number ?? null, [Validators.required, Validators.min(0.1)]],
    name: [this.data.route?.name ?? '', [Validators.required]],
    note: [this.data.route?.note ?? ''],
    enabled: [this.data.route?.enabled ?? true],
    stops: this.fb.array((this.data.route?.stops ?? []).map(stop => this.createStopGroup(stop)))
  });

  private createStopGroup(stop?: RouteStopData) {
    return this.fb.group({
      time: [stop?.time ?? '', [Validators.required]],
      shopId: [stop?.shopId ?? null],
      description: [stop?.description ?? '']
    });
  }

  get stops(): FormArray {
    return this.form.get('stops') as FormArray;
  }

  addStop() {
    this.stops.push(this.createStopGroup());
    this.stops.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cd.detectChanges();
  }

  removeStop(index: number) {
    this.stops.removeAt(index);
    this.stops.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cd.detectChanges();
  }

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as RouteData);
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  protected readonly faPlus = faPlus;
  protected readonly faTrashCan = faTrashCan;
}
