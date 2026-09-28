import {Component, computed, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import dayjs from 'dayjs';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {HouseholdLockReason, householdLockReasonLabel} from '../../../../../api/customer-api.service';

export interface LockCustomerDialogResult {
  reasonType: HouseholdLockReason;
  reasonText: string;
  lockedUntil: string | null;
}

@Component({
  selector: 'tafel-lock-customer-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
  templateUrl: 'lock-customer-dialog.component.html',
})
export class LockCustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LockCustomerDialogComponent>);

  protected readonly householdLockReasonLabel = householdLockReasonLabel;
  protected readonly lockReasonTypes = Object.values(HouseholdLockReason);

  // A convenience tag, not an exhaustive list the reason must be chosen from (see HouseholdLockReason)
  // - "Sonstiger Grund" is the sensible default for a reason that doesn't fit one of the others.
  reasonType = signal<HouseholdLockReason>(HouseholdLockReason.OTHER);
  reasonText = signal<string | null>(null);
  lockedUntil = signal<string | null>(null);

  // Earliest date a temporary lock may expire on - today would lift it again the same night it was set.
  protected readonly minLockedUntil = dayjs().add(1, 'day').format('YYYY-MM-DD');

  canSave = computed(() => !!this.reasonText()?.trim());

  save() {
    this.dialogRef.close({
      reasonType: this.reasonType(),
      reasonText: this.reasonText()!.trim(),
      lockedUntil: this.lockedUntil()
    } as LockCustomerDialogResult);
  }
}
