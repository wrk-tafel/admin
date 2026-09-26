import {Component, computed, inject} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
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
import dayjs from 'dayjs';
import {PendingDeletionsApiService} from '../../../../api/pending-deletions-api.service';

/**
 * What the automatic retention jobs will delete soon: user accounts without a login, employees no
 * longer used as a driver, and customers whose validity ended long ago. The daily notification to
 * administrators links here.
 *
 * Each of the three lists is only present when the caller may see that kind of record (the backend
 * answers `null` for the others), so a section appears exactly when its list does. Everything
 * listed is inside the job's warning window or already due - a row marked "Fällig" goes with the
 * next run of its job.
 */
@Component({
  selector: 'tafel-settings-pending-deletions',
  templateUrl: 'settings-pending-deletions.component.html',
  imports: [
    DatePipe,
    RouterLink,
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
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
  ]
})
export class SettingsPendingDeletionsComponent {
  private readonly pendingDeletionsApiService = inject(PendingDeletionsApiService);

  private readonly pendingDeletions = rxResource({
    stream: () => this.pendingDeletionsApiService.getPendingDeletions()
  });

  protected readonly loading = this.pendingDeletions.isLoading;
  protected readonly loadFailed = computed(() => this.pendingDeletions.status() === 'error');

  protected readonly users = computed(() => this.pendingDeletions.hasValue() ? this.pendingDeletions.value().users : null);
  protected readonly households = computed(() => this.pendingDeletions.hasValue() ? this.pendingDeletions.value().households : null);
  protected readonly employees = computed(() => this.pendingDeletions.hasValue() ? this.pendingDeletions.value().employees : null);

  protected readonly userColumns = ['username', 'name', 'personnelNumber', 'lastLogin', 'deletionDate'];
  protected readonly householdColumns = ['householdId', 'name', 'validUntil', 'deletionDate'];
  protected readonly employeeColumns = ['personnelNumber', 'name', 'lastUsed', 'deletionDate'];

  /** `yyyy-MM-dd` like the backend's dates, so a plain string comparison orders them. */
  private readonly today = dayjs().format('YYYY-MM-DD');

  /** A deletion date of today or earlier is what the next run of the job picks up. */
  protected isDue(deletionDate: string): boolean {
    return deletionDate.substring(0, 10) <= this.today;
  }

  protected reload() {
    this.pendingDeletions.reload();
  }
}
