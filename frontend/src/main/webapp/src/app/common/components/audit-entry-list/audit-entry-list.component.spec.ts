import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import dayjs from 'dayjs';
import {AuditEntryListComponent} from './audit-entry-list.component';
import {AuditEntryItem} from '../../../api/audit-api.service';
import {AuthenticationService} from '../../security/authentication.service';

describe('AuditEntryListComponent', () => {
  const entry: AuditEntryItem = {
    id: 1,
    occurredAt: new Date('2026-08-09T12:00:00'),
    actorUsername: 'test-user',
    actorFirstname: 'Max',
    actorLastname: 'Mustermann',
    entityType: 'Household',
    entityId: 5,
    businessKey: '1234',
    operation: 'UPDATE',
    changes: [
      {field: 'addressCity', oldValue: 'Wien', newValue: 'Graz'},
      {field: 'email', oldValue: undefined, newValue: 'a@b.at'}
    ]
  };

  let permissions: string[];

  beforeEach(() => {
    permissions = ['CUSTOMER', 'USER_MANAGEMENT'];

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthenticationService,
          useValue: {hasPermission: (permission: string) => permissions.includes(permission)}
        }
      ]
    }).compileComponents();
  });

  function createComponent(entries: AuditEntryItem[] = [entry], showSubject = false) {
    const fixture = TestBed.createComponent(AuditEntryListComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.componentRef.setInput('showSubject', showSubject);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one card per entry with its field changes', () => {
    const element: HTMLElement = createComponent().nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-entityType"]')?.textContent?.trim()).toBe('Kunde');
    expect(element.querySelector('[testid="audit-entry-0-operation"]')?.textContent?.trim()).toBe('Geändert');
    expect(element.querySelector('[testid="audit-entry-0-actor"]')?.textContent?.trim()).toBe('test-user (Max Mustermann)');
    expect(element.querySelector('[testid="audit-entry-0-change-0-field"]')?.textContent?.trim()).toBe('Ort');
    expect(element.querySelector('[testid="audit-entry-0-change-0-oldValue"]')?.textContent?.trim()).toBe('Wien');
    expect(element.querySelector('[testid="audit-entry-0-change-0-newValue"]')?.textContent?.trim()).toBe('Graz');
  });

  it('shows the time of an entry, with the full timestamp as its title', () => {
    const element: HTMLElement = createComponent().nativeElement;
    const occurredAt = element.querySelector('[testid="audit-entry-0-occurredAt"]');

    expect(occurredAt?.textContent?.trim()).toBe('12:00:00');
    expect(occurredAt?.getAttribute('title')).toBe('09.08.2026 12:00:00');
  });

  it('shows a dash rather than nothing for a value that was not set', () => {
    const element: HTMLElement = createComponent().nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-change-1-oldValue"]')?.textContent?.trim()).toBe('–');
  });

  // The colour marks which side of a change a value is on; an empty side is not a value at all.
  it('colours both sides of a change, but not an empty one', () => {
    const element: HTMLElement = createComponent().nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-change-0-oldValue"] span')?.className).toContain('bg-red-100');
    expect(element.querySelector('[testid="audit-entry-0-change-0-newValue"] span')?.className).toContain('bg-green-100');
    expect(element.querySelector('[testid="audit-entry-0-change-1-oldValue"] span')?.className).toBe('');
  });

  it('names the affected record only when asked to', () => {
    expect(createComponent([entry], false).nativeElement.querySelector('[testid="audit-entry-0-businessKey"]')).toBeNull();
    expect(createComponent([entry], true).nativeElement.querySelector('[testid="audit-entry-0-businessKey"]')?.textContent?.trim())
      .toBe('Nr. 1234');
  });

  it('attributes an entry without an acting user to the system', () => {
    const element: HTMLElement = createComponent([{...entry, actorUsername: undefined}]).nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-actor"]')?.textContent?.trim()).toBe('System');
  });

  // Entries written before the name was recorded still have to name who made the change.
  it('shows the username alone when the entry carries no name for it', () => {
    const element: HTMLElement = createComponent([{
      ...entry,
      actorFirstname: undefined,
      actorLastname: undefined
    }]).nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-actor"]')?.textContent?.trim()).toBe('test-user');
  });

  it('marks a login entry with its own colour, distinct from a plain change', () => {
    const element: HTMLElement = createComponent([
      {...entry, entityType: 'UserLogin', operation: 'LOGIN', changes: []}
    ]).nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-operation"]')?.className).toContain('bg-blue-700');
    expect(element.querySelector('[testid="audit-entry-0-operation"]')?.textContent?.trim()).toBe('Angemeldet');
    expect(element.querySelector('[testid="audit-entry-0-entityType"]')?.textContent?.trim()).toBe('Login');
  });

  it('says so when an entry carries no field changes', () => {
    const element: HTMLElement = createComponent([{...entry, changes: []}]).nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-nochanges"]')).not.toBeNull();
    expect(element.querySelector('[testid="audit-entry-0-changes"]')).toBeNull();
  });

  it('falls back to the technical field name when there is no German label', () => {
    const element: HTMLElement = createComponent([{
      ...entry,
      changes: [{field: 'somethingNew', oldValue: 'a', newValue: 'b'}]
    }]).nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-change-0-field"]')?.textContent?.trim()).toBe('somethingNew');
  });

  describe('grouping by day', () => {

    function entryAt(id: number, occurredAt: Date): AuditEntryItem {
      return {...entry, id, occurredAt};
    }

    it('puts one heading over every entry of the same day, and numbers the entries across all of them', () => {
      const element: HTMLElement = createComponent([
        entryAt(1, dayjs().hour(10).toDate()),
        entryAt(2, dayjs().hour(9).toDate()),
        entryAt(3, dayjs().subtract(1, 'day').hour(8).toDate())
      ]).nativeElement;

      expect(element.querySelectorAll('[testid^="audit-day-"][testid$="-date"]').length).toBe(2);
      expect(element.querySelector('[testid="audit-day-0-relative"]')?.textContent?.trim()).toBe('Heute');
      expect(element.querySelector('[testid="audit-day-1-relative"]')?.textContent?.trim()).toBe('Gestern');
      expect(element.querySelector('[testid="audit-entry-2"]')).not.toBeNull();
    });

    it('says how long ago a day was for the last week, and lets the date speak for itself after that', () => {
      const element: HTMLElement = createComponent([
        entryAt(1, dayjs().subtract(3, 'day').toDate()),
        entryAt(2, dayjs().subtract(30, 'day').toDate())
      ]).nativeElement;

      expect(element.querySelector('[testid="audit-day-0-relative"]')?.textContent?.trim()).toBe('vor 3 Tagen');
      expect(element.querySelector('[testid="audit-day-1-relative"]')).toBeNull();
      expect(element.querySelector('[testid="audit-day-1-date"]')?.textContent?.trim())
        .toContain(dayjs().subtract(30, 'day').format('DD.MM.YYYY'));
    });
  });

  describe('linking the record an entry is about', () => {

    function subjectLink(entries: AuditEntryItem[]): HTMLAnchorElement | null {
      return createComponent(entries, true).nativeElement.querySelector('a[testid="audit-entry-0-businessKey"]');
    }

    it('links a household-scoped entry to the customer it belongs to', () => {
      expect(subjectLink([entry])?.getAttribute('href')).toBe('/kunden/detail/1234');
      expect(subjectLink([{...entry, entityType: 'Person'}])?.getAttribute('href')).toBe('/kunden/detail/1234');
    });

    it('links a user entry to the account by its id, since the key is only the username', () => {
      const link = subjectLink([{...entry, entityType: 'User', businessKey: 'test-user', entityId: 7}]);

      expect(link?.getAttribute('href')).toBe('/benutzer/detail/7');
    });

    it('links a login entry to the account it belongs to, same as a user entry', () => {
      const link = subjectLink([{...entry, entityType: 'UserLogin', operation: 'LOGIN', businessKey: 'test-user', entityId: 7}]);

      expect(link?.getAttribute('href')).toBe('/benutzer/detail/7');
    });

    // Nothing to open, and following a link into a deleted record is worse than having none.
    it('does not link the entry that records a deletion', () => {
      expect(subjectLink([{...entry, operation: 'DELETE'}])).toBeNull();
      expect(subjectLink([{...entry, entityType: 'User', entityId: 7, operation: 'DELETE'}])).toBeNull();
    });

    it('does not link where the viewer could not open the screen anyway', () => {
      permissions = [];

      expect(subjectLink([entry])).toBeNull();
      expect(subjectLink([{...entry, entityType: 'User', entityId: 7}])).toBeNull();
    });

    it('does not link a record type that has no screen of its own', () => {
      expect(subjectLink([{...entry, entityType: 'StaticValue', businessKey: 'INCOME_LIMIT'}])).toBeNull();
      expect(subjectLink([{...entry, entityType: 'UserAuthority', businessKey: 'test-user'}])).toBeNull();
    });

    it('still names the record it cannot link to', () => {
      permissions = [];

      expect(createComponent([entry], true).nativeElement
        .querySelector('[testid="audit-entry-0-businessKey"]')?.textContent?.trim()).toBe('Nr. 1234');
    });
  });
});
