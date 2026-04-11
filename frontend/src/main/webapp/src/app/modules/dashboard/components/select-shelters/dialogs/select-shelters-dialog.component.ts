import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormCheckComponent, FormCheckInputDirective, FormCheckLabelDirective} from '@coreui/angular';
import {FormArray, FormBuilder, FormControl, ReactiveFormsModule} from '@angular/forms';
import {ShelterItem} from '../../../../../api/shelter-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {MatButton} from '@angular/material/button';

export interface SelectSheltersDialogData {
  sheltersList: ShelterItem[];
  initialSelected: ShelterItem[];
}

@Component({
  selector: 'tafel-select-shelters-dialog',
  templateUrl: 'select-shelters-dialog.component.html',
  imports: [
    TafelDialogComponent,
    ReactiveFormsModule,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    MatButton
  ]
})
export class SelectSheltersDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SelectSheltersDialogComponent>);
  readonly data: SelectSheltersDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    selectedShelters: this.fb.array<FormControl<boolean>>([]),
  });

  constructor() {
    const shelters = this.data.sheltersList ?? [];
    const initialSelected = this.data.initialSelected ?? [];

    shelters.forEach((shelter: ShelterItem) => {
      const selected = initialSelected.map(s => s.id).includes(shelter.id);
      this.selectedShelters.push(this.fb.control<boolean>(selected));
    });
  }

  save() {
    const sheltersList = this.data.sheltersList;
    if (sheltersList) {
      const selectedShelters = sheltersList.filter((_, index) => this.selectedShelters.at(index).value);
      this.dialogRef.close(selectedShelters);
    }
  }

  formatStreet(shelter: ShelterItem): string {
    const addressFormatted = [
      [shelter.addressStreet, shelter.addressHouseNumber].join(' ').trim(),
      shelter.addressStairway ? 'Stiege ' + shelter.addressStairway : undefined,
      shelter.addressDoor ? 'Top ' + shelter.addressDoor : undefined
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return addressFormatted?.trim().length > 0 ? addressFormatted : '';
  }

  get selectedShelters(): FormArray<FormControl<boolean>> {
    return this.form.controls.selectedShelters;
  }
}
