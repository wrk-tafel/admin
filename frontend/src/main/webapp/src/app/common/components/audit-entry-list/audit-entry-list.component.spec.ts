import {TestBed} from '@angular/core/testing';
import {AuditEntryListComponent} from './audit-entry-list.component';
import {AuditEntryItem} from '../../../api/audit-api.service';

describe('AuditEntryListComponent', () => {
  const entry: AuditEntryItem = {
    id: 1,
    occurredAt: new Date('2026-08-09T12:00:00'),
    actorUsername: 'test-user',
    entityType: 'Household',
    entityId: 5,
    businessKey: '1234',
    operation: 'UPDATE',
    changes: [
      {field: 'addressCity', oldValue: 'Wien', newValue: 'Graz'},
      {field: 'email', oldValue: undefined, newValue: 'a@b.at'}
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({}).compileComponents();
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
    expect(element.querySelector('[testid="audit-entry-0-actor"]')?.textContent?.trim()).toBe('test-user');
    expect(element.querySelector('[testid="audit-entry-0-change-0-field"]')?.textContent?.trim()).toBe('Ort');
    expect(element.querySelector('[testid="audit-entry-0-change-0-oldValue"]')?.textContent?.trim()).toBe('Wien');
    expect(element.querySelector('[testid="audit-entry-0-change-0-newValue"]')?.textContent?.trim()).toBe('Graz');
  });

  it('shows a dash rather than nothing for a value that was not set', () => {
    const element: HTMLElement = createComponent().nativeElement;

    expect(element.querySelector('[testid="audit-entry-0-change-1-oldValue"]')?.textContent?.trim()).toBe('–');
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
});
