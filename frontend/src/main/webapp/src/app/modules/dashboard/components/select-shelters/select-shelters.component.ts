import {Component, effect, inject, input, OnInit, output} from '@angular/core';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  ContainerComponent,
  FormCheckComponent,
  FormCheckInputDirective,
  FormCheckLabelDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalToggleDirective,
  RowComponent
} from '@coreui/angular';
import {CommonModule, NgIf} from '@angular/common';
import {FormArray, FormBuilder, FormControl, ReactiveFormsModule} from '@angular/forms';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {faCalculator} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ShelterItem} from '../../../../api/shelter-api.service';

@Component({
  selector: 'tafel-select-shelters',
  templateUrl: 'select-shelters.component.html',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    ModalBodyComponent,
    NgIf,
    ButtonDirective,
    ButtonCloseDirective,
    ReactiveFormsModule,
    TafelAutofocusDirective,
    CommonModule,
    CardFooterComponent,
    BgColorDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    ModalFooterComponent,
    FaIconComponent,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    ContainerComponent
  ],
  standalone: true
})
export class SelectSheltersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  public readonly shelters = input<ShelterItem[]>();
  public readonly initialSelectedShelters = input<ShelterItem[]>();
  public readonly updateSelectedShelters = output<ShelterItem[]>();

  form = this.fb.group({
    selectedShelters: this.fb.array<FormControl<boolean>>([]),
  });
  showSelectSheltersModal: boolean = false;

  ngOnInit(): void {
    this.shelters().forEach((shelter: ShelterItem) => {
      this.selectedShelters.push(this.fb.control<boolean>(false))
    });
  }

  initialSelectedSheltersEffect = effect(() => {
    const initialSelectedShelters = this.initialSelectedShelters() ?? [];
    this.shelters().forEach((shelter: ShelterItem, index: number) => {
      const selected = initialSelectedShelters.map(selectedShelter => selectedShelter.id).includes(shelter.id);
      this.selectedShelters.at(index)?.setValue(selected);
    });
  });

  saveShelterSelection() {
    const selectedShelters = this.shelters().filter((_, index) => this.selectedShelters.at(index).value);
    this.updateSelectedShelters.emit(selectedShelters);
    this.showSelectSheltersModal = false;
  }

  cancelModal() {
    this.showSelectSheltersModal = false;
  }

  formatShelterAddress(shelter: ShelterItem): string {
    const addressFormatted = [
      [shelter.addressStreet, shelter.addressHouseNumber].join(' ').trim(),
      shelter.addressStairway ? 'Stiege ' + shelter.addressStairway : undefined,
      shelter.addressDoor ? 'Top ' + shelter.addressDoor : undefined,
      [shelter.addressPostalCode, shelter.addressCity].join(' ').trim()
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return addressFormatted?.trim().length > 0 ? addressFormatted : '';
  }

  get selectedShelters(): FormArray<FormControl<boolean>> {
    return this.form.controls.selectedShelters;
  }

  protected readonly faCalculator = faCalculator;
}
