import {Component, inject, input, output} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {MatDialog} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {SelectSheltersDialogComponent} from './dialogs/select-shelters-dialog.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import calculateIcon from '@material-symbols/svg-400/outlined/calculate-fill.svg';

@Component({
  selector: 'tafel-select-shelters',
  templateUrl: 'select-shelters.component.html',
  imports: [
    MatButton,
    MatIcon,
    MatTooltipModule
  ]
})
export class SelectSheltersComponent {
  private readonly registerIcons = registerSvgIcons({calculate: calculateIcon});

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
}
