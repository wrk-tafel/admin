import {Component, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {StaticValueEditDialogComponent} from './dialogs/static-value-edit-dialog.component';
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
import {
  SettingsApiService,
  StaticValueItem,
  StaticValueListResponse,
  StaticValueTypeEnum
} from '../../../../api/settings-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {staticValueTypeLabels} from './static-value-type-labels';

@Component({
  selector: 'tafel-settings-static-values',
  templateUrl: 'settings-static-values.component.html',
  imports: [
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
export class SettingsStaticValuesComponent {
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _staticValues = signal<StaticValueListResponse | null>(null);
  protected staticValues = this._staticValues;
  displayedColumns = ['type', 'validFrom', 'validTo', 'amount', 'countAdults', 'countChildren', 'age', 'actions'];

  protected typeLabel(type: StaticValueTypeEnum): string {
    return staticValueTypeLabels[type];
  }

  constructor() {
    this.loadStaticValues();
  }

  private loadStaticValues() {
    this.settingsApiService.getStaticValues().subscribe({
      next: data => this._staticValues.set(data),
      error: () => this.toastr.error('Fehler beim Laden der statischen Werte', 'Fehler')
    });
  }

  protected addStaticValue() {
    const dialogRef = this.dialog.open(StaticValueEditDialogComponent, {
      data: {staticValue: undefined as any},
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((created: StaticValueItem | undefined) => {
      if (created) {
        this.settingsApiService.createStaticValue(created).subscribe({
          next: () => {
            this.toastr.success('Statischer Wert erstellt', 'Erfolgreich');
            this.loadStaticValues();
          },
          error: (error) => this.toastr.error(error.error?.message ?? 'Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected editStaticValue(staticValue: StaticValueItem) {
    const dialogRef = this.dialog.open(StaticValueEditDialogComponent, {
      data: {staticValue},
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((updated: StaticValueItem | undefined) => {
      if (updated) {
        this.settingsApiService.updateStaticValue(updated.id!, updated).subscribe({
          next: () => {
            this.toastr.success('Statischer Wert gespeichert', 'Erfolgreich');
            this.loadStaticValues();
          },
          error: (error) => this.toastr.error(error.error?.message ?? 'Speichern fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected readonly faPencil = faPencil;
  protected readonly faPlus = faPlus;
}
