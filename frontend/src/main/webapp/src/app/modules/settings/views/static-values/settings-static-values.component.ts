import {Component, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
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
import {faCheck, faPencil, faXmark} from '@fortawesome/free-solid-svg-icons';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
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
    MatButton,
    CurrencyPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class SettingsStaticValuesComponent {
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);

  private _staticValues = signal<StaticValueListResponse | null>(null);
  protected staticValues = this._staticValues;
  displayedColumns = ['type', 'amount', 'countAdults', 'countChildren', 'age', 'actions'];

  protected editingId = signal<number | null>(null);
  protected amountControl = new FormControl<number | null>(null);

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

  protected startEdit(staticValue: StaticValueItem) {
    this.editingId.set(staticValue.id!);
    this.amountControl.setValue(staticValue.amount);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(staticValue: StaticValueItem) {
    const updated: StaticValueItem = {
      ...staticValue,
      amount: this.amountControl.value
    };

    this.settingsApiService.updateStaticValue(updated.id!, updated).subscribe({
      next: () => {
        this.toastr.success('Statischer Wert gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadStaticValues();
      },
      error: (error) => this.toastr.error(error.error?.message ?? 'Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected readonly faPencil = faPencil;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
}
