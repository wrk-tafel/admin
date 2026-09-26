import {Component, computed, inject} from '@angular/core';
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
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {pendingDeletionSection} from './pending-deletion-section';

/**
 * What the automatic retention jobs will delete soon: user accounts without a login, employees no
 * longer used as a driver, and customers whose validity ended long ago. The daily notification to
 * administrators links here.
 *
 * Each of the three lists is only shown when the caller may see that kind of record (the backend
 * answers 403 for the others), and each loads, pages and fails on its own. Everything listed is
 * inside the job's warning window or already due - a row marked "Fällig" goes with the next run of
 * its job.
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
  private readonly authenticationService = inject(AuthenticationService);

  protected readonly canSeeUsers = computed(() => this.authenticationService.hasPermission('USER_MANAGEMENT'));
  protected readonly canSeeHouseholds = computed(() => this.authenticationService.hasPermission('CUSTOMER'));
  protected readonly canSeeEmployees = computed(() => this.authenticationService.hasPermission('SETTINGS'));

  protected readonly users = pendingDeletionSection(
    this.canSeeUsers,
    (page, pageSize) => this.pendingDeletionsApiService.getPendingUserDeletions(page, pageSize)
  );
  protected readonly households = pendingDeletionSection(
    this.canSeeHouseholds,
    (page, pageSize) => this.pendingDeletionsApiService.getPendingHouseholdDeletions(page, pageSize)
  );
  protected readonly employees = pendingDeletionSection(
    this.canSeeEmployees,
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
