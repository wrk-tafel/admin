import {Component, inject} from '@angular/core';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface StaticValueChangeDialogData {
  /** Names the row being changed, e.g. "Einkommensgrenze - 2 Erwachsene, 1 Kind". */
  label: string;
  oldAmount: number | null;
  /** Whether [oldAmount] is an amount planned for later rather than the one valid now. */
  oldAmountIsScheduled: boolean;
  /** `null` removes the planned [oldAmount]. */
  newAmount: number | null;
  /** `yyyy-MM-dd` the change applies from, `null` for "now". */
  validFrom: string | null;
}

/**
 * Confirms an edited amount by showing what it changes from and to, before it is sent.
 *
 * These few numbers decide who receives food, and a slipped digit changes real decisions the moment
 * it is saved - the audit trail records who changed what, but only after the fact. Reading the old
 * and the new value side by side is what catches a typo while it is still undone. A change planned for
 * a later date says from when it applies, and that the current amount stays valid until then.
 */
@Component({
  selector: 'tafel-static-value-change-dialog',
  imports: [TafelDialogComponent, MatButtonModule, CurrencyPipe, DatePipe],
  templateUrl: 'static-value-change-dialog.component.html'
})
export class StaticValueChangeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StaticValueChangeDialogComponent, boolean>);
  readonly data: StaticValueChangeDialogData = inject(MAT_DIALOG_DATA);

  protected readonly title = this.data.newAmount === null
    ? 'Geplanten Grenzwert entfernen'
    : this.data.validFrom ? 'Grenzwert planen' : 'Grenzwert ändern';
}
