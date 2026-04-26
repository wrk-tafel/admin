import {Component, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {ShelterEditDialogComponent} from './dialogs/shelter-edit-dialog.component';
import {ShelterDetailsDialogComponent} from './dialogs/shelter-details-dialog.component';
import {FormatShelterAddressPipe} from '../../../../common/pipes/format-shelter-address.pipe';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {ShelterApiService, ShelterItem, ShelterListResponse} from '../../../../api/shelter-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faEye, faEyeSlash, faMagnifyingGlass, faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'tafel-settings-shelters',
  templateUrl: 'settings-shelters.component.html',
  imports: [
    FormatShelterAddressPipe,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    FaIconComponent,
    MatButton
  ]
})
export class SettingsSheltersComponent {
  private shelterApiService = inject(ShelterApiService);
  private toastrService = inject(ToastrService);
  private dialog = inject(MatDialog);

  private _shelters = signal<ShelterListResponse | null>(null);
  protected shelters = this._shelters;
  displayedColumns = ['active', 'name', 'address', 'persons', 'actions'];

  constructor() {
    this.loadShelters();
  }

  private loadShelters() {
    this.shelterApiService.getAllShelters().subscribe({
      next: data => this._shelters.set(data),
      error: () => this.toastrService.error('Fehler beim Laden der Notschlafstellen', 'Fehler')
    });
  }

  protected editShelter(shelter: ShelterItem) {
    const dialogRef = this.dialog.open(ShelterEditDialogComponent, {
      data: {shelter},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((updated: ShelterItem | undefined) => {
      if (updated) {
        this.shelterApiService.updateShelter(updated.id, updated).subscribe({
          next: () => {
            this.toastrService.success('Notschlafstelle gespeichert', 'Erfolgreich');
            this.loadShelters();
          },
          error: () => this.toastrService.error('Speichern fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected toggleShelterVisibility(shelter: ShelterItem, enabled: boolean) {
    const updatedShelter = {
      ...shelter,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastrService.success(`Notschlafstelle ${shelter.name} geändert`, 'Erfolgreich');
        this.loadShelters();
      },
      error: error => {
        this.toastrService.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.shelterApiService.updateShelter(updatedShelter.id, updatedShelter).subscribe(observer);
  }

  protected addShelter() {
    const dialogRef = this.dialog.open(ShelterEditDialogComponent, {
      data: {shelter: undefined as any},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: any) => {
      if (created) {
        this.shelterApiService.createShelter(created).subscribe({
          next: () => {
            this.toastrService.success('Notschlafstelle erstellt', 'Erfolgreich');
            this.loadShelters();
          },
          error: () => this.toastrService.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected viewShelterDetails(shelter: ShelterItem) {
    this.dialog.open(ShelterDetailsDialogComponent, {
      data: {shelter},
      width: '600px'
    });
  }

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
}
