import {Component, input} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {
  AuditEntryItem,
  auditEntityTypeLabel,
  auditFieldLabel,
  AuditOperation,
  auditOperationLabel
} from '../../../api/audit-api.service';

/**
 * Renders a list of audit entries. Purely presentational - loading and paging belong to whoever
 * uses it, which is both the customer detail screen's "Verlauf" tab and the administration-wide
 * "Änderungsprotokoll", so the two can never drift into showing a change differently.
 */
@Component({
  selector: 'tafel-audit-entry-list',
  templateUrl: 'audit-entry-list.component.html',
  imports: [
    DatePipe,
    MatCardModule
  ]
})
export class AuditEntryListComponent {
  entries = input.required<AuditEntryItem[]>();

  /** Whether to name the affected record - off inside one household's own history, where it is given. */
  showSubject = input<boolean>(false);

  protected entityTypeLabel(entityType: string): string {
    return auditEntityTypeLabel[entityType] ?? entityType;
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

  protected operationClasses(operation: AuditOperation): string {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-700 text-white';
      case 'DELETE':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  }
}
