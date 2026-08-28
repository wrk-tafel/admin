import {Component, computed, inject, input} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {RouterLink} from '@angular/router';
import dayjs from 'dayjs';
import {
  AuditEntryItem,
  auditEntityTypeLabel,
  auditFieldLabel,
  AuditOperation,
  auditOperationLabel
} from '../../../api/audit-api.service';
import {AuthenticationService} from '../../security/authentication.service';

/** The entity types whose business key is a household number - the backend's `AuditScope.householdScoped`. */
const HOUSEHOLD_SCOPED_ENTITY_TYPES = ['Household', 'Person', 'HouseholdNote', 'Document'];

/**
 * The entity types whose business key is free text rather than a record number - "Nr." reads as a
 * record number, which none of these are: a username (`User`/`UserAuthority`/the login entry
 * `LoginAuditService` writes), a scanner-folder filename, a distribution's formatted date, or an
 * employee's personnel number (see `AuditScope`'s `businessKey` for each).
 */
const PLAIN_BUSINESS_KEY_ENTITY_TYPES = ['User', 'UserAuthority', 'UserLogin', 'ScannerFile', 'DistributionHouseholdList', 'Employee'];

/** One day's entries, as the list renders them under a single heading. */
interface AuditEntryDayGroup {
  /** `yyyy-MM-dd` - what the entries were grouped on, and the `@for` track key. */
  key: string;
  date: Date;
  /** "Heute", "Gestern", "vor 3 Tagen" - absent once a date is old enough that only the date itself still says anything. */
  relativeLabel: string | null;
  /** Where this group starts in the flat list, so an entry's test hooks keep numbering across the whole page. */
  startIndex: number;
  entries: AuditEntryItem[];
}

/**
 * Renders a list of audit entries, grouped by the day they happened on. Purely presentational -
 * loading and paging belong to whoever uses it, which is both the customer detail screen's
 * "Verlauf" tab and the administration-wide "Zugriffsprotokoll", so the two can never drift into
 * showing a change differently.
 */
@Component({
  selector: 'tafel-audit-entry-list',
  templateUrl: 'audit-entry-list.component.html',
  imports: [
    DatePipe,
    MatCardModule,
    RouterLink
  ]
})
export class AuditEntryListComponent {
  entries = input.required<AuditEntryItem[]>();

  /** Whether to name the affected record - off inside one household's own history, where it is given. */
  showSubject = input<boolean>(false);

  private readonly authenticationService = inject(AuthenticationService);

  /**
   * The entries as the template walks them: one heading per day, the entries below it in the order
   * they arrived (newest first). Grouping is done on consecutive entries rather than by collecting
   * them into a map, because the backend already sorts them - a day that appeared twice would mean
   * the sort broke, and silently merging the two halves would hide that.
   */
  protected readonly dayGroups = computed<AuditEntryDayGroup[]>(() => {
    const groups: AuditEntryDayGroup[] = [];

    this.entries().forEach((entry, index) => {
      const day = dayjs(entry.occurredAt);
      const key = day.format('YYYY-MM-DD');
      const currentGroup = groups[groups.length - 1];

      if (currentGroup?.key === key) {
        currentGroup.entries.push(entry);
      } else {
        groups.push({
          key,
          date: day.toDate(),
          relativeLabel: this.relativeDayLabel(day),
          startIndex: index,
          entries: [entry]
        });
      }
    });

    return groups;
  });

  private readonly canViewCustomers = computed(() => this.authenticationService.hasPermission('CUSTOMER'));
  private readonly canViewUsers = computed(() => this.authenticationService.hasPermission('USER_MANAGEMENT'));

  /**
   * Where the record an entry is about can be looked at, or null when it cannot be: the viewer
   * lacks the permission for that screen, the entry carries nothing to address the record by, or
   * the entry *is* the record's deletion and there is nothing left to open.
   *
   * A record deleted later still gets a link - the entry cannot know about a change that came after
   * it. Following one leads to the "not found" the screen already handles.
   */
  protected subjectLink(entry: AuditEntryItem): string[] | null {
    if (HOUSEHOLD_SCOPED_ENTITY_TYPES.includes(entry.entityType)) {
      const householdDeleted = entry.entityType === 'Household' && entry.operation === 'DELETE';
      if (!householdDeleted && this.canViewCustomers() && entry.businessKey && /^\d+$/.test(entry.businessKey)) {
        return ['/kunden/detail', entry.businessKey];
      }
      return null;
    }

    // Only the user record itself: an authority entry's id is the authority row's, not the user's.
    // A login entry's id is the same user's - it just never goes through an entity save, so it
    // carries the same link.
    const isUserOrLogin = entry.entityType === 'User' || entry.entityType === 'UserLogin';
    if (isUserOrLogin && entry.operation !== 'DELETE' && this.canViewUsers() && entry.entityId) {
      return ['/benutzer/detail', String(entry.entityId)];
    }

    return null;
  }

  protected entityTypeLabel(entityType: string): string {
    return auditEntityTypeLabel[entityType] ?? entityType;
  }

  /** The business key as shown next to an entry: "Nr. 1234" for a record number, the bare username where it is one. */
  protected businessKeyLabel(entry: AuditEntryItem): string {
    return PLAIN_BUSINESS_KEY_ENTITY_TYPES.includes(entry.entityType) ? `${entry.businessKey}` : `Nr. ${entry.businessKey}`;
  }

  protected operationLabel(operation: AuditOperation): string {
    return auditOperationLabel[operation] ?? operation;
  }

  protected fieldLabel(field: string): string {
    return auditFieldLabel[field] ?? field;
  }

  /**
   * Who made the change: the username, plus the name behind it in brackets where the entry carries
   * one. The username stays the leading part because that is what identifies the account and what
   * the log's actor filter matches on - the name only says who that account is. Entries written
   * before the name was recorded, and those made by a real person whose account has none, simply
   * show the username alone; an entry with no user behind it at all is "System".
   */
  protected actorLabel(entry: AuditEntryItem): string {
    if (!entry.actorUsername) {
      return 'System';
    }
    const name = [entry.actorFirstname, entry.actorLastname].filter(part => !!part).join(' ');
    return name ? `${entry.actorUsername} (${name})` : entry.actorUsername;
  }

  /**
   * An unset value is shown as a dash rather than left blank, so "was empty" and "the column is
   * narrow" cannot be confused for one another.
   */
  protected displayValue(value?: string): string {
    return value === undefined || value === null || value === '' ? '–' : value;
  }

  /**
   * Whether a value is one of the two sides of an actual change, and therefore gets the colour that
   * says so. An empty side is only the absence of a value - painting it red or green would claim
   * something was removed or added where nothing was there to begin with.
   */
  protected hasValue(value?: string): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  protected operationClasses(operation: AuditOperation): string {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-700 text-white';
      case 'DELETE':
        return 'bg-red-600 text-white';
      case 'LOGIN':
        return 'bg-blue-700 text-white';
      case 'READ':
        return 'bg-amber-700 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  }

  /**
   * How long ago a day was, in the terms someone scanning a page actually thinks in. Only for the
   * last week - beyond that "vor 23 Tagen" says less than the date next to it already does, and a
   * day in the future (a clock skew between instances) says nothing at all.
   */
  private relativeDayLabel(day: dayjs.Dayjs): string | null {
    const days = dayjs().startOf('day').diff(day.startOf('day'), 'day');
    if (days === 0) {
      return 'Heute';
    }
    if (days === 1) {
      return 'Gestern';
    }
    return days > 1 && days < 7 ? `vor ${days} Tagen` : null;
  }
}
