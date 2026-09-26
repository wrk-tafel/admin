import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import dayjs from 'dayjs';
import {SettingsPendingDeletionsComponent} from './settings-pending-deletions.component';
import {By} from '@angular/platform-browser';
import {MatPaginator} from '@angular/material/paginator';
import {
  PendingDeletionListResponse,
  PendingDeletionsApiService,
  PendingEmployeeDeletionItem,
  PendingEmployeeDeletionListResponse,
  PendingHouseholdDeletionItem,
  PendingHouseholdDeletionListResponse,
  PendingUserDeletionItem,
  PendingUserDeletionListResponse
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

  type UserList = PendingUserDeletionListResponse;
  type HouseholdList = PendingHouseholdDeletionListResponse;
  type EmployeeList = PendingEmployeeDeletionListResponse;

  function list<T>(items: T[], overrides: Partial<PendingDeletionListResponse<T>> = {}): PendingDeletionListResponse<T> {
    return {
      enabled: true,
      retentionText: '1 Jahr',
      warningText: '30 Tagen',
      totalCount: items.length,
      currentPage: 1,
      totalPages: items.length > 0 ? 1 : 0,
      pageSize: 10,
      items,
      ...overrides
    };
  }

  const usersList = (): UserList => list([user, neverLoggedInUser]);
  const householdsList = (): HouseholdList => list([household, unnamedHousehold], {retentionText: '7 Jahren'});
  const employeesList = (): EmployeeList => list([employee, neverUsedEmployee]);

  let apiMock: {
    getPendingUserDeletions: ReturnType<typeof vi.fn>;
    getPendingHouseholdDeletions: ReturnType<typeof vi.fn>;
    getPendingEmployeeDeletions: ReturnType<typeof vi.fn>;
  };

  interface Lists {
    users?: UserList;
    households?: HouseholdList;
    employees?: EmployeeList;
  }

  async function render(lists: Lists = {}): Promise<ComponentFixture<SettingsPendingDeletionsComponent>> {
    apiMock.getPendingUserDeletions.mockReturnValue(of(lists.users ?? usersList()));
    apiMock.getPendingHouseholdDeletions.mockReturnValue(of(lists.households ?? householdsList()));
    apiMock.getPendingEmployeeDeletions.mockReturnValue(of(lists.employees ?? employeesList()));
    return renderCurrent();
  }

  async function renderCurrent(): Promise<ComponentFixture<SettingsPendingDeletionsComponent>> {
    const fixture = TestBed.createComponent(SettingsPendingDeletionsComponent);
    await settle(fixture);
    return fixture;
  }

  async function settle(fixture: ComponentFixture<SettingsPendingDeletionsComponent>) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /**
   * Like {@link settle}, for a request that stays open on purpose: the fixture is never stable
   * while one is in flight, so it is a turn of the event loop that is waited for instead.
   */
  async function settleWithRequestOpen(fixture: ComponentFixture<SettingsPendingDeletionsComponent>) {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
  }

  /** What the paginator's own controls emit: the next-page button, or a page size picked from its select. */
  function paginatorOf(fixture: ComponentFixture<SettingsPendingDeletionsComponent>, testid: string): MatPaginator {
    const debugElement = fixture.debugElement.query(By.css(`[testid="${testid}"]`));
    return debugElement.componentInstance as MatPaginator;
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
    apiMock = {
      getPendingUserDeletions: vi.fn(),
      getPendingHouseholdDeletions: vi.fn(),
      getPendingEmployeeDeletions: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: PendingDeletionsApiService, useValue: apiMock}
      ]
    });
  });

  it('always renders all three sections, in the order users, households, employees', async () => {
    const fixture = await render();

    const headings = Array.from(el(fixture).querySelectorAll('h2')).map(h => text(h));
    expect(headings).toEqual(['Benutzerkonten (2)', 'Kunden (2)', 'Mitarbeiter (2)']);
  });

  it('builds the explanatory sentence of each section from the retention and warning texts', async () => {
    const fixture = await render();

    expect(text(byTestId(fixture, 'pending-users-description')))
      .toBe('Benutzerkonten werden nach 1 Jahr ohne Anmeldung automatisch gelöscht - '
        + 'hier stehen die, bei denen das in den nächsten 30 Tagen passiert.');
    expect(text(byTestId(fixture, 'pending-households-description')))
      .toContain('Kunden werden nach 7 Jahren seit Ablauf der Gültigkeit automatisch gelöscht');
    expect(text(byTestId(fixture, 'pending-employees-description')))
      .toContain('Mitarbeiter werden nach 1 Jahr ohne Einsatz als Fahrer:in oder Beifahrer:in automatisch gelöscht');
  });

  describe('users', () => {
    it('links the username to the user detail view', async () => {
      const fixture = await render();

      const link = byTestId(fixture, 'pending-user-link-11') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/benutzer/detail/11');
      expect(text(link)).toBe('mmuster');
    });

    it('shows name, personnel number and the last login date', async () => {
      const fixture = await render();

      const row = text(byTestId(fixture, 'pending-user-row-11'));
      expect(row).toContain('Max Muster');
      expect(row).toContain('00100');
      expect(text(byTestId(fixture, 'pending-user-last-login-11'))).toContain('05.10.2025');
    });

    it('says when an account never logged in and when it was created', async () => {
      const fixture = await render();

      expect(text(byTestId(fixture, 'pending-user-last-login-12'))).toBe('nie angemeldet (angelegt am 04.03.2025)');
    });

    it('marks an account whose deletion date has passed as due, and one still to come as not', async () => {
      const fixture = await render();

      expect(text(byTestId(fixture, 'pending-user-overdue-12'))).toBe('Fällig');
      expect(byTestId(fixture, 'pending-user-overdue-11')).toBeNull();
    });

    it('lists the same rows in the table and the card layout', async () => {
      const fixture = await render();

      expect(el(fixture).querySelectorAll('[testid="pending-users-table"] [testid="pending-user-row-11"]').length).toBe(1);
      expect(el(fixture).querySelectorAll('[testid="pending-users-cards"] [testid="pending-user-row-11"]').length).toBe(1);
    });

    it('says so when nothing is due, without a paginator', async () => {
      const fixture = await render({users: list<PendingUserDeletionItem>([])});

      expect(text(byTestId(fixture, 'pending-users-empty'))).toBe('Keine Benutzerkonten in den nächsten 30 Tagen fällig.');
      expect(byTestId(fixture, 'pending-users-table')).toBeNull();
      expect(byTestId(fixture, 'pending-users-paginator')).toBeNull();
      expect(byTestId(fixture, 'pending-users-paginator-bottom')).toBeNull();
      expect(text(byTestId(fixture, 'pending-users-heading'))).toBe('Benutzerkonten (0)');
    });

    it('says the automatic deletion is switched off when the job is disabled', async () => {
      const fixture = await render({users: list<PendingUserDeletionItem>([], {enabled: false})});

      expect(text(byTestId(fixture, 'pending-users-disabled'))).toBe('Die automatische Löschung ist deaktiviert.');
      expect(byTestId(fixture, 'pending-users-empty')).toBeNull();
      expect(byTestId(fixture, 'pending-users-description')).toBeNull();
      expect(byTestId(fixture, 'pending-users-paginator')).toBeNull();
      expect(text(byTestId(fixture, 'pending-users-heading'))).toBe('Benutzerkonten');
    });
  });

  describe('households', () => {
    it('links the business number to the customer detail view', async () => {
      const fixture = await render();

      const link = byTestId(fixture, 'pending-household-link-4711') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/kunden/detail/4711');
      expect(text(link)).toBe('4711');
    });

    it('shows the name, the validity end and the deletion date', async () => {
      const fixture = await render();

      const row = text(byTestId(fixture, 'pending-household-row-4711'));
      expect(row).toContain('Beispiel Berta');
      expect(row).toContain('31.05.2019');
      expect(text(byTestId(fixture, 'pending-household-deletion-date-4711')))
        .toContain(dayjs(inTenDays).format('DD.MM.YYYY'));
    });

    it('shows a dash for a household without a name', async () => {
      const fixture = await render();

      const cells = Array.from(el(fixture).querySelectorAll('[testid="pending-households-table"] [testid="pending-household-row-4712"] td'))
        .map(cell => text(cell));
      expect(cells[1]).toBe('-');
    });

    it('marks a deletion date of today as due, and one still to come as not', async () => {
      const fixture = await render();

      expect(text(byTestId(fixture, 'pending-household-overdue-4712'))).toBe('Fällig');
      expect(byTestId(fixture, 'pending-household-overdue-4711')).toBeNull();
    });

    it('says so when nothing is due', async () => {
      const fixture = await render({households: list<PendingHouseholdDeletionItem>([], {retentionText: '7 Jahren'})});

      expect(text(byTestId(fixture, 'pending-households-empty'))).toBe('Keine Kunden in den nächsten 30 Tagen fällig.');
    });

    it('says the automatic deletion is switched off when the job is disabled', async () => {
      const fixture = await render({households: list<PendingHouseholdDeletionItem>([], {enabled: false})});

      expect(text(byTestId(fixture, 'pending-households-disabled'))).toBe('Die automatische Löschung ist deaktiviert.');
    });
  });

  describe('employees', () => {
    it('shows personnel number, name and last use, without a detail link', async () => {
      const fixture = await render();

      const row = text(byTestId(fixture, 'pending-employee-row-21'));
      expect(row).toContain('02000');
      expect(row).toContain('Fritz Fahrer');
      expect(text(byTestId(fixture, 'pending-employee-last-used-21'))).toContain('01.09.2025');
      expect(byTestId(fixture, 'pending-employee-row-21')!.querySelector('a')).toBeNull();
    });

    it('says when an employee was never used and when they were created', async () => {
      const fixture = await render();

      expect(text(byTestId(fixture, 'pending-employee-last-used-22'))).toBe('nie eingesetzt (angelegt am 03.02.2025)');
    });

    it('links to the employee management screen', async () => {
      const fixture = await render();

      const link = byTestId(fixture, 'pending-employees-manage-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/einstellungen/mitarbeiter');
      expect(text(link)).toBe('Mitarbeiter verwalten');
    });

    it('marks an employee whose deletion date has passed as due', async () => {
      const fixture = await render();

      expect(text(byTestId(fixture, 'pending-employee-overdue-22'))).toBe('Fällig');
      expect(byTestId(fixture, 'pending-employee-overdue-21')).toBeNull();
    });

    it('says so when nothing is due', async () => {
      const fixture = await render({employees: list<PendingEmployeeDeletionItem>([])});

      expect(text(byTestId(fixture, 'pending-employees-empty'))).toBe('Keine Mitarbeiter in den nächsten 30 Tagen fällig.');
    });

    it('says the automatic deletion is switched off when the job is disabled', async () => {
      const fixture = await render({employees: list<PendingEmployeeDeletionItem>([], {enabled: false})});

      expect(text(byTestId(fixture, 'pending-employees-disabled'))).toBe('Die automatische Löschung ist deaktiviert.');
    });
  });

  describe('paging', () => {
    // 25 accounts in total, two rows on the page shown - the page itself is not what is tested here
    const pagedUsers = () => list([user, neverLoggedInUser], {totalCount: 25, totalPages: 3, pageSize: 10});

    function clearCalls() {
      apiMock.getPendingUserDeletions.mockClear();
      apiMock.getPendingHouseholdDeletions.mockClear();
      apiMock.getPendingEmployeeDeletions.mockClear();
    }

    it('requests the first page of every section with the default page size', async () => {
      await render();

      expect(apiMock.getPendingUserDeletions).toHaveBeenCalledWith(1, 10);
      expect(apiMock.getPendingHouseholdDeletions).toHaveBeenCalledWith(1, 10);
      expect(apiMock.getPendingEmployeeDeletions).toHaveBeenCalledWith(1, 10);
    });

    it('shows a paginator above and below each list, fed by the total count and the current page', async () => {
      const fixture = await render({users: list([user, neverLoggedInUser], {totalCount: 25, totalPages: 3, currentPage: 2, pageSize: 10})});

      for (const kind of ['users', 'households', 'employees']) {
        expect(byTestId(fixture, `pending-${kind}-paginator`)).not.toBeNull();
        expect(byTestId(fixture, `pending-${kind}-paginator-bottom`)).not.toBeNull();
      }
      const paginator = paginatorOf(fixture, 'pending-users-paginator');
      expect(paginator.length).toBe(25);
      expect(paginator.pageIndex).toBe(1);
      expect(paginator.pageSize).toBe(10);
      expect(paginator.showFirstLastButtons).toBe(true);
      expect(paginator.pageSizeOptions).toEqual([5, 10, 25, 50, 100]);
      expect(text(byTestId(fixture, 'pending-users-heading'))).toBe('Benutzerkonten (25)');
    });

    it('does not show a truncation hint however many entries there are', async () => {
      const fixture = await render({users: pagedUsers()});

      expect(byTestId(fixture, 'pending-users-truncated')).toBeNull();
    });

    it('loads only that section when its page changes', async () => {
      const fixture = await render({users: pagedUsers()});
      clearCalls();

      paginatorOf(fixture, 'pending-users-paginator').nextPage();
      await settle(fixture);

      expect(apiMock.getPendingUserDeletions).toHaveBeenCalledTimes(1);
      expect(apiMock.getPendingUserDeletions).toHaveBeenCalledWith(2, 10);
      expect(apiMock.getPendingHouseholdDeletions).not.toHaveBeenCalled();
      expect(apiMock.getPendingEmployeeDeletions).not.toHaveBeenCalled();
    });

    it('pages through the bottom paginator the same way', async () => {
      const fixture = await render({employees: list([employee], {totalCount: 12, totalPages: 2, pageSize: 10})});
      clearCalls();

      paginatorOf(fixture, 'pending-employees-paginator-bottom').nextPage();
      await settle(fixture);

      expect(apiMock.getPendingEmployeeDeletions).toHaveBeenCalledWith(2, 10);
      expect(apiMock.getPendingUserDeletions).not.toHaveBeenCalled();
      expect(apiMock.getPendingHouseholdDeletions).not.toHaveBeenCalled();
    });

    it('starts over at page 1 when the page size changes, reloading only that section', async () => {
      const fixture = await render({households: list([household], {totalCount: 60, totalPages: 6, pageSize: 10})});
      paginatorOf(fixture, 'pending-households-paginator').nextPage();
      await settle(fixture);
      expect(apiMock.getPendingHouseholdDeletions).toHaveBeenLastCalledWith(2, 10);
      clearCalls();

      paginatorOf(fixture, 'pending-households-paginator')._changePageSize(25);
      await settle(fixture);

      expect(apiMock.getPendingHouseholdDeletions).toHaveBeenCalledTimes(1);
      expect(apiMock.getPendingHouseholdDeletions).toHaveBeenCalledWith(1, 25);
      expect(apiMock.getPendingUserDeletions).not.toHaveBeenCalled();
      expect(apiMock.getPendingEmployeeDeletions).not.toHaveBeenCalled();
    });

    it('keeps the list on screen while the next page loads', async () => {
      const fixture = await render({users: pagedUsers()});
      const nextPage = new Subject<UserList>();
      apiMock.getPendingUserDeletions.mockReturnValue(nextPage);

      paginatorOf(fixture, 'pending-users-paginator').nextPage();
      await settleWithRequestOpen(fixture);

      expect(byTestId(fixture, 'pending-users-table')).not.toBeNull();
      expect(byTestId(fixture, 'pending-users-loading')).toBeNull();

      nextPage.next(list([user], {totalCount: 25, totalPages: 3, currentPage: 2}));
      await settle(fixture);

      expect(paginatorOf(fixture, 'pending-users-paginator').pageIndex).toBe(1);
      expect(byTestId(fixture, 'pending-user-row-12')).toBeNull();
    });
  });

  describe('loading', () => {
    it('loads every section on its own', async () => {
      const users = new Subject<UserList>();
      apiMock.getPendingUserDeletions.mockReturnValue(users);
      apiMock.getPendingHouseholdDeletions.mockReturnValue(of(householdsList()));
      apiMock.getPendingEmployeeDeletions.mockReturnValue(of(employeesList()));
      const fixture = TestBed.createComponent(SettingsPendingDeletionsComponent);
      await settleWithRequestOpen(fixture);

      expect(byTestId(fixture, 'pending-users-loading')).not.toBeNull();
      expect(byTestId(fixture, 'pending-households-table')).not.toBeNull();
      expect(byTestId(fixture, 'pending-employees-table')).not.toBeNull();

      users.next(usersList());
      await settle(fixture);

      expect(byTestId(fixture, 'pending-users-loading')).toBeNull();
      expect(byTestId(fixture, 'pending-users-table')).not.toBeNull();
    });

    it('shows an error in the failing section only, and loads that section again on retry', async () => {
      apiMock.getPendingUserDeletions.mockReturnValue(throwError(() => new Error('boom')));
      apiMock.getPendingHouseholdDeletions.mockReturnValue(of(householdsList()));
      apiMock.getPendingEmployeeDeletions.mockReturnValue(of(employeesList()));
      const fixture = await renderCurrent();

      expect(text(byTestId(fixture, 'pending-users-error'))).toContain('konnten nicht geladen werden.');
      expect(byTestId(fixture, 'pending-users-table')).toBeNull();
      expect(byTestId(fixture, 'pending-households-error')).toBeNull();
      expect(byTestId(fixture, 'pending-households-table')).not.toBeNull();
      expect(byTestId(fixture, 'pending-employees-error')).toBeNull();
      expect(byTestId(fixture, 'pending-employees-table')).not.toBeNull();

      apiMock.getPendingUserDeletions.mockReturnValue(of(usersList()));
      (byTestId(fixture, 'pending-users-retry') as HTMLButtonElement).click();
      await settle(fixture);

      expect(byTestId(fixture, 'pending-users-error')).toBeNull();
      expect(byTestId(fixture, 'pending-users-table')).not.toBeNull();
      expect(apiMock.getPendingUserDeletions).toHaveBeenCalledTimes(2);
      expect(apiMock.getPendingHouseholdDeletions).toHaveBeenCalledTimes(1);
      expect(apiMock.getPendingEmployeeDeletions).toHaveBeenCalledTimes(1);
    });
  });
});
