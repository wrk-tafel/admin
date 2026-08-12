import {Component, inject} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface StaticValueChangeDialogData {
  /** Names the row being changed, e.g. "Einkommensgrenze - 2 Erwachsene, 1 Kind". */
  label: string;
  oldAmount: number | null;
  newAmount: number;
}

/**
 * Confirms an edited amount by showing what it changes from and to, before it is sent.
 *
 * These few numbers decide who receives food, and a slipped digit changes real decisions the moment
 * it is saved - the audit trail records who changed what, but only after the fact. Reading the old
 * and the new value side by side is what catches a typo while it is still undone.
 */
@Component({
  selector: 'tafel-static-value-change-dialog',
  imports: [TafelDialogComponent, MatButtonModule, CurrencyPipe],
  templateUrl: 'static-value-change-dialog.component.html'
})
export class StaticValueChangeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StaticValueChangeDialogComponent, boolean>);
  readonly data: StaticValueChangeDialogData = inject(MAT_DIALOG_DATA);
}
