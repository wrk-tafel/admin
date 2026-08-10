import {Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
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
import {MatTooltipModule} from '@angular/material/tooltip';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {staticValueTypeLabels} from './static-value-type-labels';

@Component({
  selector: 'tafel-settings-static-values',
  templateUrl: 'settings-static-values.component.html',
  imports: [
    MatCard,
    MatCardActions,
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
    MatInputModule,
    MatTooltipModule
  ]
})
export class SettingsStaticValuesComponent {
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);

  private _staticValues = signal<StaticValueListResponse | null>(null);
  protected staticValues = this._staticValues;
  displayedColumns = ['type', 'countAdults', 'countChildren', 'age', 'amount', 'actions'];

  protected editingId = signal<number | null>(null);
  protected amountControl = new FormControl<number | null>(null);
  private amountInput = viewChild<ElementRef<HTMLInputElement>>('amountInput');
  private amountInputMobile = viewChild<ElementRef<HTMLInputElement>>('amountInputMobile');

  protected typeLabel(type: StaticValueTypeEnum): string {
    return staticValueTypeLabels[type];
  }

  /**
   * Names one row for the row actions' accessible names. The type alone does not identify a row -
   * several rows share it and differ only in their household size or age.
   */
  protected rowLabel(staticValue: StaticValueItem): string {
    const parts = [this.typeLabel(staticValue.type!)];
    if (staticValue.countAdults != null) {
      parts.push(`${staticValue.countAdults} Erwachsene`);
    }
    if (staticValue.countChildren != null) {
      parts.push(`${staticValue.countChildren} Kinder`);
    }
    if (staticValue.age != null) {
      parts.push(`Alter ${staticValue.age}`);
    }
    return parts.join(', ');
  }

  constructor() {
    this.loadStaticValues();

    effect(() => {
      this.amountInput()?.nativeElement.focus();
      this.amountInputMobile()?.nativeElement.focus();
    });
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
