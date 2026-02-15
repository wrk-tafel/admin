import {Component, effect, inject, input, output} from '@angular/core';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  ColComponent,
  ContainerComponent,
  FormCheckComponent,
  FormCheckInputDirective,
  FormCheckLabelDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalToggleDirective,
  RowComponent
} from '@coreui/angular';

import {FormArray, FormBuilder, FormControl, ReactiveFormsModule} from '@angular/forms';
import {faCalculator} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ShelterItem} from '../../../../api/shelter-api.service';

@Component({
  selector: 'tafel-select-shelters',
  templateUrl: 'select-shelters.component.html',
  imports: [
    RowComponent,
    ColComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    ModalBodyComponent,
    ButtonDirective,
    ButtonCloseDirective,
    ReactiveFormsModule,
    BgColorDirective,
    ModalFooterComponent,
    FaIconComponent,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    ContainerComponent
  ]
})
export class SelectSheltersComponent {
  private readonly fb = inject(FormBuilder);

  public readonly sheltersList = input<ShelterItem[]>();
  public readonly initialSelectedShelters = input<ShelterItem[]>();
  public readonly updateSelectedShelters = output<ShelterItem[]>();
  public readonly disabled = input<boolean>();

  form = this.fb.group({
    selectedShelters: this.fb.array<FormControl<boolean>>([]),
  });
  showSelectSheltersModal: boolean = false;

  sheltersEffect = effect(() => {
    const shelters = this.sheltersList() ?? [];
    const initialSelectedShelters = this.initialSelectedShelters() ?? [];

    // Only rebuild if we have shelters
    if (shelters.length > 0) {
      // Clear the form array first to avoid duplicates
      this.selectedShelters.clear();

      // Rebuild the form array with proper initial values
      shelters.forEach((shelter: ShelterItem) => {
        const selected = initialSelectedShelters.map(selectedShelter => selectedShelter.id).includes(shelter.id);
        this.selectedShelters.push(this.fb.control<boolean>(selected));
      });
    }
  });

  saveShelterSelection() {
    const sheltersList = this.sheltersList();
    if (sheltersList) {
      const selectedShelters = sheltersList.filter((_, index) => this.selectedShelters.at(index).value);
      this.updateSelectedShelters.emit(selectedShelters);
    }
    this.showSelectSheltersModal = false;
  }

  cancelModal() {
    this.showSelectSheltersModal = false;
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

  trackByShelterId(index: number, shelter: ShelterItem): number {
    return shelter.id;
  }

  get selectedShelters(): FormArray<FormControl<boolean>> {
    return this.form.controls.selectedShelters;
  }

  protected readonly faCalculator = faCalculator;
}
