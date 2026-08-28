import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
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
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import historyIcon from '@material-symbols/svg-400/outlined/history-fill.svg';
import openInNewIcon from '@material-symbols/svg-400/outlined/open_in_new-fill.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import {TafelIfPermissionDirective} from '../../../../common/security/tafel-if-permission.directive';
import {
  StaticValueChangeDialogComponent,
  StaticValueChangeDialogData
} from './dialogs/static-value-change-dialog.component';
import {
  StaticValueGroupKey,
  staticValueGroups,
  StaticValueQualifierField,
  staticValueTypeSpecs
} from './static-value-types';

/** One editable amount, plus what tells it apart from the other rows of its type. */
export interface StaticValueRowView {
  staticValue: StaticValueItem;
  /**
   * Position in the list as the API returns it, not within the section. It numbers the row's test
   * hooks and inline-edit input, so grouping the rows doesn't renumber them.
   */
  index: number;
  /** e.g. "2 Erwachsene, 1 Kind" or "ab 10 Jahren"; `null` for a type with a single row. */
  qualifier: string | null;
}

/** The rows of one static value type, under the explanation that applies to all of them. */
export interface StaticValueSectionView {
  type: StaticValueTypeEnum;
  label: string;
  /**
   * Whether the section carries a heading of its own. The one type the group's heading already
   * names does not - it would repeat it word for word. The [label] stays either way; it names the
   * row's actions and its confirmation, where the group heading is not in view.
   */
  showHeading: boolean;
  description: string;
  qualifierHeader: string | null;
  /** The table's columns - the qualifier only where the rows differ in one. */
  columns: string[];
  rows: StaticValueRowView[];
}

export interface StaticValueGroupView {
  key: StaticValueGroupKey;
  title: string;
  description?: string;
  sections: StaticValueSectionView[];
}

/** Opens the access log on this screen's records, with no other filter narrowing them. */
export const AUDIT_LOG_QUERY_PARAMS = {art: 'StaticValue'};

/**
 * Maintains the numeric constants behind income validation and the cost contribution.
 *
 * The screen is built around the fact that these few numbers decide who receives food: every type
 * is explained where it is edited, the rows are split into the two domains they belong to
 * ([staticValueGroups]) instead of listed flat, and an edited amount is confirmed as old -> new
 * before it is sent - the change applies to every eligibility check from the moment it is saved.
 *
 * Only the amount is editable; type, household composition and age identify which row a lookup
 * matches and are therefore read-only.
 */
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
    MatIcon,
    MatButton,
    CurrencyPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    RouterLink,
    TafelIfPermissionDirective
  ]
})
export class SettingsStaticValuesComponent {
  private readonly registerIcons = registerSvgIcons({
    history: historyIcon,
    open_in_new: openInNewIcon,
    check: checkIcon,
    close: closeIcon,
    edit: editIcon
  });

  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _staticValues = signal<StaticValueListResponse | null>(null);
  protected staticValues = this._staticValues;

  /**
   * The rows of every section, grouped by domain and by type. A type with no row at all is left
   * out, so an environment that has never had e.g. a cost contribution shows no empty section.
   */
  protected readonly groups = computed<StaticValueGroupView[]>(() => {
    const rows = (this._staticValues()?.staticValues ?? [])
      .map((staticValue, index) => ({staticValue, index, qualifier: this.qualifierOf(staticValue)}));

    return staticValueGroups
      .map(group => ({
        ...group,
        sections: Object.entries(staticValueTypeSpecs)
          .filter(([, spec]) => spec.group === group.key)
          .map(([type, spec]) => ({
            type: type as StaticValueTypeEnum,
            label: spec.label,
            showHeading: type !== group.headingType,
            description: spec.description,
            qualifierHeader: spec.qualifierHeader,
            columns: spec.qualifierHeader ? ['qualifier', 'amount', 'actions'] : ['amount', 'actions'],
            rows: rows.filter(row => row.staticValue.type === type)
          }))
          .filter(section => section.rows.length > 0)
      }))
      .filter(group => group.sections.length > 0);
  });

  protected editingId = signal<number | null>(null);
  protected amountControl = new FormControl<number | null>(null);
  private amountInput = viewChild<ElementRef<HTMLInputElement>>('amountInput');
  private amountInputMobile = viewChild<ElementRef<HTMLInputElement>>('amountInputMobile');

  constructor() {
    this.loadStaticValues();

    effect(() => {
      this.amountInput()?.nativeElement.focus();
      this.amountInputMobile()?.nativeElement.focus();
    });
  }

  /**
   * Names one row for the row actions' accessible names and for the confirmation. The type alone
   * does not identify a row - several rows share it and differ only in their qualifier.
   */
  protected rowLabel(section: StaticValueSectionView, row: StaticValueRowView): string {
    return row.qualifier ? `${section.label} - ${row.qualifier}` : section.label;
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

  /**
   * Asks for confirmation of the delta before sending it. An amount that was left as it was needs
   * neither - it simply ends the edit, rather than writing a change that changes nothing (which the
   * audit trail would record as one).
   */
  protected saveEdit(section: StaticValueSectionView, row: StaticValueRowView) {
    const amount = this.amountControl.value;
    if (amount === null || Number.isNaN(amount)) {
      this.toastr.error('Bitte einen Betrag eingeben', 'Fehler');
      return;
    }

    if (amount === row.staticValue.amount) {
      this.cancelEdit();
      return;
    }

    const data: StaticValueChangeDialogData = {
      label: this.rowLabel(section, row),
      oldAmount: row.staticValue.amount,
      newAmount: amount
    };

    this.dialog.open(StaticValueChangeDialogComponent, {width: '600px', data})
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.updateAmount(row.staticValue, amount);
        }
      });
  }

  private updateAmount(staticValue: StaticValueItem, amount: number) {
    const updated: StaticValueItem = {...staticValue, amount};

    this.settingsApiService.updateStaticValue(updated.id!, updated).subscribe({
      next: () => {
        this.toastr.success('Statischer Wert gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadStaticValues();
      },
      error: (error) => this.toastr.error(error.error?.message ?? 'Speichern fehlgeschlagen', 'Fehler')
    });
  }

  /** Only the fields the row's type actually looks up by - see [staticValueTypeSpecs]. */
  private qualifierOf(staticValue: StaticValueItem): string | null {
    const fields = staticValueTypeSpecs[staticValue.type]?.qualifierFields ?? [];
    const parts = fields
      .map(field => this.qualifierPart(field, staticValue[field]))
      .filter((part): part is string => part !== null);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  private qualifierPart(field: StaticValueQualifierField, value: number | null): string | null {
    if (value === null) {
      return null;
    }
    switch (field) {
      case 'countAdults':
        return value === 1 ? '1 Erwachsener' : `${value} Erwachsene`;
      case 'countChildren':
        return value === 1 ? '1 Kind' : `${value} Kinder`;
      case 'age':
        return `ab ${value} Jahren`;
    }
  }

  protected readonly auditLogQueryParams = AUDIT_LOG_QUERY_PARAMS;
}
