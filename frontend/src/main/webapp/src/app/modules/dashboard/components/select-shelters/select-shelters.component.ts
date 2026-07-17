import {Component, inject, input, output} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {faCalculator} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {MatDialog} from '@angular/material/dialog';
import {SelectSheltersDialogComponent} from './dialogs/select-shelters-dialog.component';

@Component({
  selector: 'tafel-select-shelters',
  templateUrl: 'select-shelters.component.html',
  imports: [
    MatButton,
    FaIconComponent
  ]
})
export class SelectSheltersComponent {
  private readonly dialog = inject(MatDialog);

  public readonly sheltersList = input<ShelterItem[]>();
  public readonly initialSelectedShelters = input<ShelterItem[]>();
  public readonly updateSelectedShelters = output<ShelterItem[]>();
  public readonly disabled = input<boolean>();

  openSelectSheltersDialog() {
    this.dialog.open(SelectSheltersDialogComponent, {
      data: {
        sheltersList: this.sheltersList(),
        initialSelected: this.initialSelectedShelters()
      }
    }).afterClosed().subscribe(selectedShelters => {
      if (selectedShelters) {
        this.updateSelectedShelters.emit(selectedShelters);
      }
    });
  }

  protected readonly faCalculator = faCalculator;
}
