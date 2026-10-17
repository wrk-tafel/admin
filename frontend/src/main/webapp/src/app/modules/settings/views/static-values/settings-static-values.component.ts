import {Component, computed, effect, ElementRef, inject, signal, viewChildren} from '@angular/core';
import {CurrencyPipe, DatePipe, NgTemplateOutlet} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
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
  StaticValueRequest,
  StaticValueTypeEnum
} from '../../../../api/settings-api.service';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
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
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import eventUpcomingIcon from '@material-symbols/svg-400/outlined/event_upcoming-fill.svg';
import {formatIsoDate, parseIsoDate} from '../../../../common/date/date-values';
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
  /**
   * The table's columns - the qualifier only where the rows differ in one, the planned amount only
   * where one of the rows has one.
   */
  columns: string[];
  rows: StaticValueRowView[];
}

export interface StaticValueGroupView {
  key: StaticValueGroupKey;
  title: string;
  description?: string;
  sections: StaticValueSectionView[];
}

/** How many rows already have an amount planned from one date on - see `scheduledDates`. */
export interface StaticValueScheduledDateView {
  /** `yyyy-MM-dd` */
  validFrom: string;
  count: number;
}

/** Opens the access log on this screen's records, with no other filter narrowing them. */
export const AUDIT_LOG_QUERY_PARAMS = {art: 'StaticValue'};

/**
 * Maintains the numeric constants behind income validation and the cost contribution.
 *
 * The screen is built around the fact that these few numbers decide who receives food: every type
 * is explained where it is edited, the rows are split into the two domains they belong to
 * ([staticValueGroups]) instead of listed flat, and an edited amount is confirmed as old -> new
 * before it is sent.
 *
 * An amount applies from the date it is given: today means every eligibility check from the moment it
 * is saved, a later date plans it - typically the next year's limits, entered once they are published
 * and taking over on 1 January by themselves. A planned amount is shown next to the current one, and
 * a notice above the lists says which dates have one, so nobody is surprised by it or enters it twice.
 * Each row has at most one plan; it can be changed or removed until its date comes.
 *
 * Only the amount and its start date are editable; type, household composition and age identify which
 * row a lookup matches and are therefore read-only.
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
    MatIconButton,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
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
    edit: editIcon,
    delete: deleteIcon,
    event_upcoming: eventUpcomingIcon
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
          .map(([type, spec]) => {
            const sectionRows = rows.filter(row => row.staticValue.type === type);
            return {
              type: type as StaticValueTypeEnum,
              label: spec.label,
              showHeading: type !== group.headingType,
              description: spec.description,
              qualifierHeader: spec.qualifierHeader,
              columns: [
                ...(spec.qualifierHeader ? ['qualifier'] : []),
                'amount',
                ...(sectionRows.some(row => row.staticValue.scheduled) ? ['scheduled'] : []),
                'actions'
              ],
              rows: sectionRows
            };
          })
          .filter(section => section.rows.length > 0)
      }))
      .filter(group => group.sections.length > 0);
  });

  /**
   * The dates from which amounts are already planned, earliest first, with how many rows each - what
   * the notice above the lists announces.
   */
  protected readonly scheduledDates = computed<StaticValueScheduledDateView[]>(() => {
    const counts = new Map<string, number>();
    for (const staticValue of this._staticValues()?.staticValues ?? []) {
      if (staticValue.scheduled) {
        counts.set(staticValue.scheduled.validFrom, (counts.get(staticValue.scheduled.validFrom) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([validFrom, count]) => ({validFrom, count}));
  });

  /** The id of the row being edited - a current row's own, or that of the amount planned to replace it. */
  protected editingId = signal<number | null>(null);
  protected amountControl = new FormControl<number | null>(null);
  protected validFromControl = new FormControl<Date | null>(null);
  protected readonly today = startOfDay(new Date());
  // The table and the card list both render the editor, one of them hidden by a breakpoint -
  // focusing the hidden one does nothing.
  private amountInputs = viewChildren<ElementRef<HTMLInputElement>>('amountInput');

  constructor() {
    this.loadStaticValues();

    effect(() => this.amountInputs().forEach(input => input.nativeElement.focus()));
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

  /** Edits the current amount; the date starts at today, which is what applying it now means. */
  protected startEdit(staticValue: StaticValueItem) {
    this.editingId.set(staticValue.id!);
    this.amountControl.setValue(staticValue.amount);
    this.validFromControl.setValue(this.today);
  }

  protected startEditScheduled(staticValue: StaticValueItem) {
    const scheduled = staticValue.scheduled!;
    this.editingId.set(scheduled.id);
    this.amountControl.setValue(scheduled.amount);
    this.validFromControl.setValue(parseIsoDate(scheduled.validFrom));
  }

  protected isEditingScheduled(row: StaticValueRowView): boolean {
    const scheduledId = row.staticValue.scheduled?.id;
    return scheduledId !== undefined && this.editingId() === scheduledId;
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  /**
   * Asks for confirmation of the delta before sending it. An amount that was left as it was needs
   * neither - it simply ends the edit, rather than writing a change that changes nothing (which the
   * audit trail would record as one).
   *
   * A date after today plans the amount. A current row that already has a plan changes that plan
   * rather than stacking a second one behind it, so the confirmation compares against the planned
   * amount then. A planned amount moved to today applies now instead, and its plan is dropped.
   */
  protected saveEdit(section: StaticValueSectionView, row: StaticValueRowView) {
    const amount = this.amountControl.value;
    if (amount === null || Number.isNaN(amount)) {
      this.toastr.error('Bitte einen Betrag eingeben', 'Fehler');
      return;
    }

    const date = this.validFromControl.value;
    if (!date || this.validFromControl.hasError('matDatepickerParse')) {
      this.toastr.error('Bitte ein gültiges Datum eingeben (TT.MM.JJJJ)', 'Fehler');
      return;
    }

    const editingScheduled = this.isEditingScheduled(row);
    const validFrom = formatIsoDate(date);
    const today = formatIsoDate(this.today);
    if (validFrom < today) {
      this.toastr.error('Das Datum darf nicht in der Vergangenheit liegen', 'Fehler');
      return;
    }

    const appliesNow = validFrom === today;
    const scheduled = row.staticValue.scheduled ?? null;
    const replaced = appliesNow ? null : scheduled;
    // a planned amount moved to today applies now, and the plan is dropped
    const dropsScheduled = editingScheduled && appliesNow;

    const unchanged = replaced
      ? amount === replaced.amount && validFrom === replaced.validFrom
      : appliesNow && !dropsScheduled && amount === row.staticValue.amount;
    if (unchanged) {
      this.cancelEdit();
      return;
    }

    const data: StaticValueChangeDialogData = {
      label: this.rowLabel(section, row),
      oldAmount: replaced ? replaced.amount : row.staticValue.amount,
      oldAmountIsScheduled: replaced !== null,
      newAmount: amount,
      validFrom: appliesNow ? null : validFrom,
      ...(dropsScheduled ? {droppedScheduledFrom: scheduled!.validFrom} : {})
    };

    this.confirm(data, () => {
      const targetId = editingScheduled ? scheduled!.id : row.staticValue.id!;
      const request: StaticValueRequest = {
        id: targetId,
        type: row.staticValue.type,
        validFrom,
        validTo: row.staticValue.validTo,
        amount,
        countAdults: row.staticValue.countAdults,
        countChildren: row.staticValue.countChildren,
        age: row.staticValue.age
      };

      this.settingsApiService.updateStaticValue(targetId, request).subscribe({
        next: () => this.saved(appliesNow ? 'Statischer Wert gespeichert' : 'Statischer Wert geplant'),
        error: (error) => this.toastr.error(error.error?.message ?? 'Speichern fehlgeschlagen', 'Fehler')
      });
    });
  }

  /** Removes the amount planned for [row], after confirming it - the current amount then stays valid. */
  protected removeScheduled(section: StaticValueSectionView, row: StaticValueRowView) {
    const scheduled = row.staticValue.scheduled!;
    const data: StaticValueChangeDialogData = {
      label: this.rowLabel(section, row),
      oldAmount: scheduled.amount,
      oldAmountIsScheduled: true,
      newAmount: null,
      validFrom: scheduled.validFrom
    };

    this.confirm(data, () => this.settingsApiService.deleteStaticValue(scheduled.id).subscribe({
      next: () => this.saved('Geplanter Wert entfernt'),
      error: (error) => this.toastr.error(error.error?.message ?? 'Entfernen fehlgeschlagen', 'Fehler')
    }));
  }

  private confirm(data: StaticValueChangeDialogData, onConfirmed: () => void) {
    this.dialog.open(StaticValueChangeDialogComponent, {width: '600px', data})
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirmed();
        }
      });
  }

  private saved(message: string) {
    this.toastr.success(message, 'Erfolgreich');
    this.editingId.set(null);
    this.loadStaticValues();
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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
