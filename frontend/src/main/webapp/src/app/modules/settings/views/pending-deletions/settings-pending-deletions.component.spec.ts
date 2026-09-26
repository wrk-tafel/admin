import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import dayjs from 'dayjs';
import {SettingsPendingDeletionsComponent} from './settings-pending-deletions.component';
import {
  PendingDeletionsApiService,
  PendingDeletionsResponse,
  PendingEmployeeDeletionItem,
  PendingHouseholdDeletionItem,
  PendingUserDeletionItem
} from '../../../../api/pending-deletions-api.service';

describe('SettingsPendingDeletionsComponent', () => {
  const inTenDays = dayjs().add(10, 'day').format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');

  const user: PendingUserDeletionItem = {
    id: 11,
    username: 'mmuster',
    firstname: 'Max',
    lastname: 'Muster',
    personnelNumber: '00100',
    lastLogin: '2025-10-05T08:30:00Z',
    createdAt: '2024-01-02T10:00:00Z',
    deletionDate: inTenDays
  };
  const neverLoggedInUser: PendingUserDeletionItem = {
    id: 12,
    username: 'neverin',
    firstname: 'Nora',
    lastname: 'Neu',
    personnelNumber: '00200',
    lastLogin: null,
    createdAt: '2025-03-04T10:00:00Z',
    deletionDate: yesterday
  };
  const household: PendingHouseholdDeletionItem = {
    householdId: 4711,
    name: 'Beispiel Berta',
    validUntil: '2019-05-31',
    deletionDate: inTenDays
  };
  const unnamedHousehold: PendingHouseholdDeletionItem = {
    householdId: 4712,
    name: null,
    validUntil: '2019-04-30',
    deletionDate: today
  };
  const employee: PendingEmployeeDeletionItem = {
    id: 21,
    personnelNumber: '02000',
    firstname: 'Fritz',
    lastname: 'Fahrer',
    lastUsed: '2025-09-01T12:00:00Z',
    createdAt: '2023-01-01T10:00:00Z',
    deletionDate: inTenDays
  };
  const neverUsedEmployee: PendingEmployeeDeletionItem = {
    id: 22,
    personnelNumber: '02100',
    firstname: 'Nina',
    lastname: 'Neu',
    lastUsed: null,
    createdAt: '2025-02-03T10:00:00Z',
    deletionDate: yesterday
  };

  const fullResponse: PendingDeletionsResponse = {
    users: {
      enabled: true,
      retentionText: '1 Jahr',
      warningText: '30 Tagen',
      totalCount: 2,
      items: [user, neverLoggedInUser]
    },
    households: {
      enabled: true,
      retentionText: '7 Jahren',
      warningText: '30 Tagen',
      totalCount: 2,
      items: [household, unnamedHousehold]
    },
    employees: {
      enabled: true,
      retentionText: '1 Jahr',
      warningText: '30 Tagen',
      totalCount: 2,
      items: [employee, neverUsedEmployee]
    }
  };

  let apiMock: { getPendingDeletions: ReturnType<typeof vi.fn> };

  async function render(response: PendingDeletionsResponse): Promise<ComponentFixture<SettingsPendingDeletionsComponent>> {
    apiMock.getPendingDeletions.mockReturnValue(of(response));
    return renderCurrent();
  }

  async function renderCurrent(): Promise<ComponentFixture<SettingsPendingDeletionsComponent>> {
    const fixture = TestBed.createComponent(SettingsPendingDeletionsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function el(fixture: ComponentFixture<SettingsPendingDeletionsComponent>): HTMLElement {
    return fixture.nativeElement;
  }

  function byTestId(fixture: ComponentFixture<SettingsPendingDeletionsComponent>, id: string): HTMLElement | null {
    return el(fixture).querySelector(`[testid="${id}"]`);
  }

  function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  beforeEach(() => {
    apiMock = {getPendingDeletions: vi.fn()};

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: PendingDeletionsApiService, useValue: apiMock}
      ]
    });
  });

  it('renders the three sections in order: users, households, employees', async () => {
    const fixture = await render(fullResponse);

    const headings = Array.from(el(fixture).querySelectorAll('h2')).map(h => text(h));
    expect(headings).toEqual(['Benutzerkonten (2)', 'Kunden (2)', 'Mitarbeiter (2)']);
  });

  it('hides the sections the caller has no permission for', async () => {
    const fixture = await render({...fullResponse, users: null, households: null});

    expect(byTestId(fixture, 'pending-users-section')).toBeNull();
    expect(byTestId(fixture, 'pending-households-section')).toBeNull();
    expect(byTestId(fixture, 'pending-employees-section')).not.toBeNull();
  });

  it('builds the explanatory sentence of each section from the retention and warning texts', async () => {
    const fixture = await render(fullResponse);

    expect(text(byTestId(fixture, 'pending-users-description')))
      .toBe('Benutzerkonten werden nach 1 Jahr ohne Anmeldung automatisch gelöscht - '
        + 'hier stehen die, bei denen das in den nächsten 30 Tagen passiert.');
    expect(text(byTestId(fixture, 'pending-households-description')))
      .toContain('Kunden werden nach 7 Jahren seit Ablauf der Gültigkeit automatisch gelöscht');
    expect(text(byTestId(fixture, 'pending-employees-description')))
      .toContain('Mitarbeiter werden nach 1 Jahr ohne Einsatz als Fahrer:in automatisch gelöscht');
  });

  describe('users', () => {
    it('links the username to the user detail view', async () => {
      const fixture = await render(fullResponse);

      const link = byTestId(fixture, 'pending-user-link-11') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/benutzer/detail/11');
      expect(text(link)).toBe('mmuster');
    });

    it('shows name, personnel number and the last login date', async () => {
      const fixture = await render(fullResponse);

      const row = text(byTestId(fixture, 'pending-user-row-11'));
      expect(row).toContain('Max Muster');
      expect(row).toContain('00100');
      expect(text(byTestId(fixture, 'pending-user-last-login-11'))).toContain('05.10.2025');
    });

    it('says when an account never logged in and when it was created', async () => {
      const fixture = await render(fullResponse);

      expect(text(byTestId(fixture, 'pending-user-last-login-12'))).toBe('nie angemeldet (angelegt am 04.03.2025)');
    });

    it('marks an account whose deletion date has passed as due, and one still to come as not', async () => {
      const fixture = await render(fullResponse);

      expect(text(byTestId(fixture, 'pending-user-overdue-12'))).toBe('Fällig');
      expect(byTestId(fixture, 'pending-user-overdue-11')).toBeNull();
    });

    it('lists the same rows in the table and the card layout', async () => {
      const fixture = await render(fullResponse);

      expect(el(fixture).querySelectorAll('[testid="pending-users-table"] [testid="pending-user-row-11"]').length).toBe(1);
      expect(el(fixture).querySelectorAll('[testid="pending-users-cards"] [testid="pending-user-row-11"]').length).toBe(1);
    });

    it('says so when nothing is due', async () => {
      const fixture = await render({
        ...fullResponse,
        users: {enabled: true, retentionText: '1 Jahr', warningText: '30 Tagen', totalCount: 0, items: []}
      });

      expect(text(byTestId(fixture, 'pending-users-empty'))).toBe('Keine Benutzerkonten in den nächsten 30 Tagen fällig.');
      expect(byTestId(fixture, 'pending-users-table')).toBeNull();
      expect(text(byTestId(fixture, 'pending-users-heading'))).toBe('Benutzerkonten (0)');
    });

    it('says the automatic deletion is switched off when the job is disabled', async () => {
      const fixture = await render({
        ...fullResponse,
        users: {enabled: false, retentionText: '1 Jahr', warningText: '30 Tagen', totalCount: 0, items: []}
      });

      expect(text(byTestId(fixture, 'pending-users-disabled'))).toBe('Die automatische Löschung ist deaktiviert.');
      expect(byTestId(fixture, 'pending-users-empty')).toBeNull();
      expect(byTestId(fixture, 'pending-users-description')).toBeNull();
      expect(text(byTestId(fixture, 'pending-users-heading'))).toBe('Benutzerkonten');
    });

    it('hints at the truncation when more are due than listed', async () => {
      const fixture = await render({
        ...fullResponse,
        users: {...fullResponse.users!, totalCount: 250}
      });

      expect(text(byTestId(fixture, 'pending-users-truncated'))).toBe('Es werden die ersten 2 von 250 angezeigt.');
      expect(text(byTestId(fixture, 'pending-users-heading'))).toBe('Benutzerkonten (250)');
    });

    it('shows no truncation hint when every entry is listed', async () => {
      const fixture = await render(fullResponse);

      expect(byTestId(fixture, 'pending-users-truncated')).toBeNull();
    });
  });

  describe('households', () => {
    it('links the business number to the customer detail view', async () => {
      const fixture = await render(fullResponse);

      const link = byTestId(fixture, 'pending-household-link-4711') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/kunden/detail/4711');
      expect(text(link)).toBe('4711');
    });

    it('shows the name, the validity end and the deletion date', async () => {
      const fixture = await render(fullResponse);

      const row = text(byTestId(fixture, 'pending-household-row-4711'));
      expect(row).toContain('Beispiel Berta');
      expect(row).toContain('31.05.2019');
      expect(text(byTestId(fixture, 'pending-household-deletion-date-4711')))
        .toContain(dayjs(inTenDays).format('DD.MM.YYYY'));
    });

    it('shows a dash for a household without a name', async () => {
      const fixture = await render(fullResponse);

      const cells = Array.from(el(fixture).querySelectorAll('[testid="pending-households-table"] [testid="pending-household-row-4712"] td'))
        .map(cell => text(cell));
      expect(cells[1]).toBe('-');
    });

    it('marks a deletion date of today as due, and one still to come as not', async () => {
      const fixture = await render(fullResponse);

      expect(text(byTestId(fixture, 'pending-household-overdue-4712'))).toBe('Fällig');
      expect(byTestId(fixture, 'pending-household-overdue-4711')).toBeNull();
    });

    it('says so when nothing is due', async () => {
      const fixture = await render({
        ...fullResponse,
        households: {enabled: true, retentionText: '7 Jahren', warningText: '30 Tagen', totalCount: 0, items: []}
      });

      expect(text(byTestId(fixture, 'pending-households-empty'))).toBe('Keine Kunden in den nächsten 30 Tagen fällig.');
    });

    it('says the automatic deletion is switched off when the job is disabled', async () => {
      const fixture = await render({
        ...fullResponse,
        households: {enabled: false, retentionText: '7 Jahren', warningText: '30 Tagen', totalCount: 0, items: []}
      });

      expect(text(byTestId(fixture, 'pending-households-disabled'))).toBe('Die automatische Löschung ist deaktiviert.');
    });

    it('hints at the truncation when more are due than listed', async () => {
      const fixture = await render({
        ...fullResponse,
        households: {...fullResponse.households!, totalCount: 3}
      });

      expect(text(byTestId(fixture, 'pending-households-truncated'))).toBe('Es werden die ersten 2 von 3 angezeigt.');
    });
  });

  describe('employees', () => {
    it('shows personnel number, name and last use, without a detail link', async () => {
      const fixture = await render(fullResponse);

      const row = text(byTestId(fixture, 'pending-employee-row-21'));
      expect(row).toContain('02000');
      expect(row).toContain('Fritz Fahrer');
      expect(text(byTestId(fixture, 'pending-employee-last-used-21'))).toContain('01.09.2025');
      expect(byTestId(fixture, 'pending-employee-row-21')!.querySelector('a')).toBeNull();
    });

    it('says when an employee was never used and when they were created', async () => {
      const fixture = await render(fullResponse);

      expect(text(byTestId(fixture, 'pending-employee-last-used-22'))).toBe('nie eingesetzt (angelegt am 03.02.2025)');
    });

    it('links to the employee management screen', async () => {
      const fixture = await render(fullResponse);

      const link = byTestId(fixture, 'pending-employees-manage-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/einstellungen/mitarbeiter');
      expect(text(link)).toBe('Mitarbeiter verwalten');
    });

    it('marks an employee whose deletion date has passed as due', async () => {
      const fixture = await render(fullResponse);

      expect(text(byTestId(fixture, 'pending-employee-overdue-22'))).toBe('Fällig');
      expect(byTestId(fixture, 'pending-employee-overdue-21')).toBeNull();
    });

    it('says so when nothing is due', async () => {
      const fixture = await render({
        ...fullResponse,
        employees: {enabled: true, retentionText: '1 Jahr', warningText: '30 Tagen', totalCount: 0, items: []}
      });

      expect(text(byTestId(fixture, 'pending-employees-empty'))).toBe('Keine Mitarbeiter in den nächsten 30 Tagen fällig.');
    });

    it('says the automatic deletion is switched off when the job is disabled', async () => {
      const fixture = await render({
        ...fullResponse,
        employees: {enabled: false, retentionText: '1 Jahr', warningText: '30 Tagen', totalCount: 0, items: []}
      });

      expect(text(byTestId(fixture, 'pending-employees-disabled'))).toBe('Die automatische Löschung ist deaktiviert.');
    });

    it('hints at the truncation when more are due than listed', async () => {
      const fixture = await render({
        ...fullResponse,
        employees: {...fullResponse.employees!, totalCount: 500}
      });

      expect(text(byTestId(fixture, 'pending-employees-truncated'))).toBe('Es werden die ersten 2 von 500 angezeigt.');
    });
  });

  describe('loading', () => {
    it('shows an error with a retry that loads again when the request fails', async () => {
      apiMock.getPendingDeletions.mockReturnValue(throwError(() => new Error('boom')));
      const fixture = await renderCurrent();

      expect(text(byTestId(fixture, 'pending-deletions-error'))).toContain('Die anstehenden Löschungen konnten nicht geladen werden.');
      expect(byTestId(fixture, 'pending-users-section')).toBeNull();

      apiMock.getPendingDeletions.mockReturnValue(of(fullResponse));
      (byTestId(fixture, 'pending-deletions-retry') as HTMLButtonElement).click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(byTestId(fixture, 'pending-deletions-error')).toBeNull();
      expect(byTestId(fixture, 'pending-users-section')).not.toBeNull();
      expect(apiMock.getPendingDeletions).toHaveBeenCalledTimes(2);
    });

    it('shows a loading hint until the answer arrives', async () => {
      const answer = new Subject<PendingDeletionsResponse>();
      apiMock.getPendingDeletions.mockReturnValue(answer);
      const fixture = TestBed.createComponent(SettingsPendingDeletionsComponent);
      fixture.detectChanges();

      expect(byTestId(fixture, 'pending-deletions-loading')).not.toBeNull();
      expect(byTestId(fixture, 'pending-users-section')).toBeNull();

      answer.next(fullResponse);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(byTestId(fixture, 'pending-deletions-loading')).toBeNull();
      expect(byTestId(fixture, 'pending-users-section')).not.toBeNull();
    });
  });
});
