import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective, FormCheckComponent, FormCheckInputDirective, FormCheckLabelDirective} from '@coreui/angular';
import {FormArray, FormBuilder, FormControl, ReactiveFormsModule} from '@angular/forms';
import {ShelterItem} from '../../../../../api/shelter-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SelectSheltersDialogData {
  sheltersList: ShelterItem[];
  initialSelected: ShelterItem[];
}

@Component({
  selector: 'tafel-select-shelters-dialog',
  imports: [
    TafelDialogComponent, ButtonDirective, ReactiveFormsModule,
    FormCheckComponent, FormCheckInputDirective, FormCheckLabelDirective
  ],
  template: `
    <tafel-dialog title="Notschlafstellen auswählen">
      <div tafel-dialog-content>
        <form [formGroup]="form" autocomplete="off">
          @if (data.sheltersList && data.sheltersList.length > 0) {
            <div formArrayName="selectedShelters">
              @for (shelter of data.sheltersList; track shelter.id; let idx = $index) {
                @if (idx > 0) {
                  <hr/>
                }
                <div class="d-flex flex-row align-items-start gap-2">
                  <div class="flex-shrink-0">
                    <c-form-check switch="true" sizing="xl">
                      <input
                        type="checkbox"
                        [formControl]="selectedShelters.controls[idx]"
                        [id]="'shelter-' + shelter.id"
                        [attr.testid]="'selectable-shelter-row-' + idx"
                        cFormCheckInput
                      >
                    </c-form-check>
                  </div>
                  <div class="flex-grow-1 text-start text-wrap">
                    <strong>{{ shelter.name }}</strong>
                    <br>
                    <label cFormCheckLabel [for]="'shelter-' + shelter.id">
                      {{ formatStreet(shelter) }}
                      <br>
                      {{ shelter.addressPostalCode }} {{ shelter.addressCity }}
                    </label>
                  </div>
                  <div class="fs-5">{{ shelter.personsCount }} Personen</div>
                </div>
              }
            </div>
          }
        </form>
      </div>
      <div tafel-dialog-actions>
        <button testid="selectshelters-save-button" cButton (click)="save()" [disabled]="form.invalid">Speichern</button>
        <button testid="selectshelters-cancel-button" cButton color="secondary" (click)="dialogRef.close()">Abbrechen
        </button>
      </div>
    </tafel-dialog>
  `,
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
