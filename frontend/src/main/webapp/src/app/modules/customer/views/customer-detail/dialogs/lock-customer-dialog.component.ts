import {Component, computed, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {FormsModule} from '@angular/forms';
import dayjs from 'dayjs';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {HouseholdLockReason, householdLockReasonLabel} from '../../../../../api/customer-api.service';
import {provideTafelDateAdapter} from '../../../../../common/date/tafel-date-adapter';
import {formatIsoDate, parseIsoDate} from '../../../../../common/date/date-values';

/** The existing lock, when the dialog edits one instead of setting a new one. */
export interface LockCustomerDialogData {
  reasonType?: HouseholdLockReason | null;
  reasonText?: string | null;
  lockedUntil?: string | null;
}

export interface LockCustomerDialogResult {
  reasonType: HouseholdLockReason;
  reasonText: string;
  lockedUntil: string | null;
}

@Component({
  selector: 'tafel-lock-customer-dialog',
  imports: [
    TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepicker, MatDatepickerInput,
    MatDatepickerToggle, FormsModule
  ],
  // A dialog is created under the root injector, where the shell route's date adapter is not visible.
  providers: [provideTafelDateAdapter()],
  templateUrl: 'lock-customer-dialog.component.html',
})
export class LockCustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LockCustomerDialogComponent>);
  private readonly existingLock = inject<LockCustomerDialogData | null>(MAT_DIALOG_DATA, {optional: true});

  protected readonly editing = !!this.existingLock;

  protected readonly householdLockReasonLabel = householdLockReasonLabel;
  protected readonly lockReasonTypes = Object.values(HouseholdLockReason);

  // A convenience tag, not an exhaustive list the reason must be chosen from (see HouseholdLockReason)
  // - "Sonstiger Grund" is the sensible default for a reason that doesn't fit one of the others.
  reasonType = signal<HouseholdLockReason>(this.existingLock?.reasonType ?? HouseholdLockReason.OTHER);
  reasonText = signal<string | null>(this.existingLock?.reasonText ?? null);
  lockedUntil = signal<Date | null>(parseIsoDate(this.existingLock?.lockedUntil));

  // Earliest date a temporary lock may expire on - today would lift it again the same night it was set.
  // An existing lock that already ends earlier (today) keeps that date valid, so its reason can still
  // be changed without having to move its end as well.
  protected readonly minLockedUntil = this.earliestLockedUntil();

  private earliestLockedUntil(): Date {
    const tomorrow = dayjs().add(1, 'day').startOf('day');
    const existing = this.lockedUntil();
    return existing && dayjs(existing).isBefore(tomorrow) ? dayjs(existing).startOf('day').toDate() : tomorrow.toDate();
  }

  canSave = computed(() => !!this.reasonText()?.trim());

  save() {
    this.dialogRef.close({
      reasonType: this.reasonType(),
      reasonText: this.reasonText()!.trim(),
      lockedUntil: this.lockedUntil() ? formatIsoDate(this.lockedUntil()!) : null
    } as LockCustomerDialogResult);
  }
}
