import {Component, inject} from '@angular/core';
import {DatePipe, NgTemplateOutlet} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatPaginatorModule} from '@angular/material/paginator';
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
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {pendingDeletionSection} from './pending-deletion-section';

/**
 * What the automatic retention jobs will delete soon: user accounts without a login, employees no
 * longer used as a driver, and customers whose validity ended long ago. The daily notification to
 * administrators links here.
 *
 * The route is for administrators only (`settings.routes.ts`), who hold every permission, so all
 * three lists are always shown. Each loads, pages and fails on its own. Everything listed is inside
 * the job's warning window or already due - a row marked "Fällig" goes with the next run of its job.
 */
@Component({
  selector: 'tafel-settings-pending-deletions',
  templateUrl: 'settings-pending-deletions.component.html',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    MatButton,
    MatPaginatorModule,
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

  protected readonly users = pendingDeletionSection(
    (page, pageSize) => this.pendingDeletionsApiService.getPendingUserDeletions(page, pageSize)
  );
  protected readonly households = pendingDeletionSection(
    (page, pageSize) => this.pendingDeletionsApiService.getPendingHouseholdDeletions(page, pageSize)
  );
  protected readonly employees = pendingDeletionSection(
    (page, pageSize) => this.pendingDeletionsApiService.getPendingEmployeeDeletions(page, pageSize)
  );

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected readonly userColumns = ['username', 'name', 'personnelNumber', 'lastLogin', 'deletionDate'];
  protected readonly householdColumns = ['householdId', 'name', 'validUntil', 'deletionDate'];
  protected readonly employeeColumns = ['personnelNumber', 'name', 'lastUsed', 'deletionDate'];

  /** `yyyy-MM-dd` like the backend's dates, so a plain string comparison orders them. */
  private readonly today = dayjs().format('YYYY-MM-DD');

  /** A deletion date of today or earlier is what the next run of the job picks up. */
  protected isDue(deletionDate: string): boolean {
    return deletionDate.substring(0, 10) <= this.today;
  }
}
