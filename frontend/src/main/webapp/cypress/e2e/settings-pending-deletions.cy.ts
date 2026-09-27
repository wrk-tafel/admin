import dayjs from 'dayjs';
import {MAIN_CONTENT} from '../support/accessibility';
import {testUserPassword} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

// One endpoint per kind of record - the glob's trailing `*` lets the query string (page, pageSize) match.
const USERS_URL = '/api/settings/pending-deletions/users*';
const HOUSEHOLDS_URL = '/api/settings/pending-deletions/households*';
const EMPLOYEES_URL = '/api/settings/pending-deletions/employees*';
const SCREEN_URL = '/einstellungen/anstehende-loeschungen';

type Kind = 'users' | 'households' | 'employees';

// The envelope every list comes in. Dates in the items are relative to today, since the "Fällig"
// chip is decided against the current date.
function list<T>(items: T[], overrides: Record<string, unknown> = {}) {
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

function usersList(overrides: Record<string, unknown> = {}) {
  const inTenDays = dayjs().add(10, 'day').format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  return list([
    {
      id: 9001,
      username: 'pending.user',
      firstname: 'Paula',
      lastname: 'Pending',
      personnelNumber: '09001',
      lastLogin: '2025-10-05T08:30:00Z',
      createdAt: '2024-01-02T10:00:00Z',
      deletionDate: inTenDays
    },
    {
      id: 9002,
      username: 'never.in',
      firstname: 'Nora',
      lastname: 'Neu',
      personnelNumber: '09002',
      lastLogin: null,
      createdAt: '2025-03-04T10:00:00Z',
      deletionDate: yesterday
    }
  ], overrides);
}

function householdsList(overrides: Record<string, unknown> = {}) {
  const inTenDays = dayjs().add(10, 'day').format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  return list([
    {householdId: 7001, name: 'Beispiel Berta', validUntil: '2019-05-31', deletionDate: inTenDays},
    {householdId: 7002, name: null, validUntil: '2019-04-30', deletionDate: yesterday}
  ], {retentionText: '7 Jahren', ...overrides});
}

function employeesList(overrides: Record<string, unknown> = {}) {
  const inTenDays = dayjs().add(10, 'day').format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  return list([
    {
      id: 8001,
      personnelNumber: '08001',
      firstname: 'Fritz',
      lastname: 'Fahrer',
      lastUsed: '2025-09-01T12:00:00Z',
      createdAt: '2023-01-01T10:00:00Z',
      deletionDate: inTenDays
    },
    {
      id: 8002,
      personnelNumber: '08002',
      firstname: 'Nina',
      lastname: 'Neu',
      lastUsed: null,
      createdAt: '2025-02-03T10:00:00Z',
      deletionDate: yesterday
    }
  ], overrides);
}

// Stubs all three endpoints and gives each an alias (`@users`, `@households`, `@employees`).
function stubLists(lists: { users?: object; households?: object; employees?: object } = {}) {
  cy.intercept('GET', USERS_URL, {body: lists.users ?? usersList()}).as('users');
  cy.intercept('GET', HOUSEHOLDS_URL, {body: lists.households ?? householdsList()}).as('households');
  cy.intercept('GET', EMPLOYEES_URL, {body: lists.employees ?? employeesList()}).as('employees');
}

// A list of 60 entries, answered page by page the way the backend does: the page and page size come
// from the request's own query, and the answer says which page it is.
function stubPagedList(kind: Kind, url: string, build: (overrides: Record<string, unknown>) => object) {
  cy.intercept('GET', url, (req) => {
    const query = new URL(req.url).searchParams;
    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('pageSize') ?? 10);
    req.reply({body: build({totalCount: 60, totalPages: Math.ceil(60 / pageSize), currentPage: page, pageSize})});
  }).as(kind);
}

function queryOf(interception: { request: { url: string } }) {
  const query = new URL(interception.request.url).searchParams;
  return {page: query.get('page'), pageSize: query.get('pageSize')};
}

function nextPage(kind: Kind, position: '' | '-bottom' = '') {
  cy.byTestId(`pending-${kind}-paginator${position}`).scrollIntoView()
    .find('.mat-mdc-paginator-navigation-next').click();
}

function pickPageSize(kind: Kind, size: number) {
  // forced: the app scrolls inside its own container, which Cypress cannot scroll clear of the sticky
  // header, so the actionability check would report the header as covering the select
  cy.byTestId(`pending-${kind}-paginator`).find('mat-select').click({force: true});
  cy.get('mat-option').contains(new RegExp(`^\\s*${size}\\s*$`)).click();
}

describe('Settings - Pending deletions', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  describe('with the real backend', () => {

    it('renders the screen with its title and all three sections', () => {
      cy.visit(SCREEN_URL);

      cy.get('h1').should('contain.text', 'Anstehende Löschungen');
      cy.byTestId('pending-users-section').should('be.visible');
      cy.byTestId('pending-households-section').should('be.visible');
      cy.byTestId('pending-employees-section').should('be.visible');
      cy.byTestId('pending-users-heading').should('contain.text', 'Benutzerkonten');
      cy.byTestId('pending-households-heading').should('contain.text', 'Kunden');
      cy.byTestId('pending-employees-heading').should('contain.text', 'Mitarbeiter');
    });

    // The e2e data holds no account, customer or employee old enough to be within a job's warning
    // window, so each section says nothing is due - unless an operator switched its job off.
    it('says per section that nothing is due', () => {
      cy.visit(SCREEN_URL);

      cy.byTestId('pending-users-section').should('be.visible').invoke('text')
        .should('match', /Keine Benutzerkonten in den nächsten .+ fällig\.|Die automatische Löschung ist deaktiviert\./);
      // the e2e data holds a customer whose validity ended in the year 2000, long past its retention time
      cy.byTestId('pending-households-section').invoke('text')
        .should('match', /Die automatische Löschung ist deaktiviert\.|ABGELAUFEN Herta/);
      cy.byTestId('pending-household-overdue-104').should('exist');
      cy.byTestId('pending-employees-section').invoke('text')
        .should('match', /Keine Mitarbeiter in den nächsten .+ fällig\.|Die automatische Löschung ist deaktiviert\./);
    });

    it('requests each list from its own endpoint, once, with the first page', () => {
      cy.intercept('GET', USERS_URL).as('users');
      cy.intercept('GET', HOUSEHOLDS_URL).as('households');
      cy.intercept('GET', EMPLOYEES_URL).as('employees');
      cy.visit(SCREEN_URL);

      for (const kind of ['users', 'households', 'employees']) {
        cy.wait(`@${kind}`).then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
          expect(queryOf(interception)).to.deep.eq({page: '1', pageSize: '10'});
        });
      }
    });

    it('has no accessibility violations', () => {
      cy.visit(SCREEN_URL);
      cy.byTestId('pending-employees-section').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  describe('with due deletions', () => {

    beforeEach(() => {
      stubLists({users: usersList({totalCount: 25, totalPages: 3})});
      cy.visit(SCREEN_URL);
      cy.wait(['@users', '@households', '@employees']);
    });

    it('explains each list with its retention and warning texts', () => {
      cy.byTestId('pending-users-description').should('contain.text',
        'Benutzerkonten werden nach 1 Jahr ohne Anmeldung automatisch gelöscht - '
        + 'hier stehen die, bei denen das in den nächsten 30 Tagen passiert.');
      cy.byTestId('pending-households-description').should('contain.text',
        'Kunden werden nach 7 Jahren seit Ablauf der Gültigkeit automatisch gelöscht');
      cy.byTestId('pending-employees-description').should('contain.text',
        'Mitarbeiter werden nach 1 Jahr ohne Einsatz als Fahrer:in oder Beifahrer:in automatisch gelöscht');
    });

    it('lists the accounts, linking each to its detail view', () => {
      // the heading counts every entry, not just the page shown
      cy.byTestId('pending-users-heading').should('contain.text', 'Benutzerkonten (25)');

      cy.byTestId('pending-users-table').within(() => {
        cy.byTestId('pending-user-link-9001')
          .should('have.attr', 'href', '/benutzer/detail/9001')
          .and('have.text', 'pending.user');
        cy.byTestId('pending-user-row-9001').should('contain.text', 'Paula Pending').and('contain.text', '09001');
        cy.byTestId('pending-user-last-login-9001').should('contain.text', '05.10.2025');
        cy.byTestId('pending-user-deletion-date-9001')
          .should('contain.text', dayjs().add(10, 'day').format('DD.MM.YYYY'));
      });
    });

    it('says when an account never logged in and when it was created', () => {
      cy.byTestId('pending-users-table').within(() => {
        cy.byTestId('pending-user-last-login-9002').should('contain.text', 'nie angemeldet (angelegt am 04.03.2025)');
      });
    });

    it('lists the customers, linking each business number to its detail view', () => {
      cy.byTestId('pending-households-table').within(() => {
        cy.byTestId('pending-household-link-7001').should('have.attr', 'href', '/kunden/detail/7001');
        cy.byTestId('pending-household-row-7001').should('contain.text', 'Beispiel Berta').and('contain.text', '31.05.2019');
        // no name on record: a dash instead of an empty cell
        cy.byTestId('pending-household-row-7002').find('td').eq(1).should('have.text', '-');
      });
    });

    it('lists the employees without a detail link, but with one to the employee management', () => {
      cy.byTestId('pending-employees-table').within(() => {
        cy.byTestId('pending-employee-row-8001').should('contain.text', 'Fritz Fahrer').and('contain.text', '08001');
        cy.byTestId('pending-employee-last-used-8001').should('contain.text', '01.09.2025');
        cy.byTestId('pending-employee-row-8001').find('a').should('not.exist');
        cy.byTestId('pending-employee-last-used-8002').should('contain.text', 'nie eingesetzt (angelegt am 03.02.2025)');
      });

      cy.byTestId('pending-employees-manage-link')
        .should('have.attr', 'href', '/einstellungen/mitarbeiter')
        .and('contain.text', 'Mitarbeiter verwalten');
    });

    it('marks what is already due and nothing else', () => {
      cy.byTestId('pending-users-table').within(() => {
        cy.byTestId('pending-user-overdue-9002').should('have.text', 'Fällig');
        cy.byTestId('pending-user-overdue-9001').should('not.exist');
      });
      cy.byTestId('pending-households-table').within(() => {
        cy.byTestId('pending-household-overdue-7002').should('have.text', 'Fällig');
        cy.byTestId('pending-household-overdue-7001').should('not.exist');
      });
      cy.byTestId('pending-employees-table').within(() => {
        cy.byTestId('pending-employee-overdue-8002').should('have.text', 'Fällig');
        cy.byTestId('pending-employee-overdue-8001').should('not.exist');
      });
    });

    it('shows a paginator above and below every list and no truncation hint', () => {
      for (const kind of ['users', 'households', 'employees']) {
        cy.byTestId(`pending-${kind}-paginator`).should('exist');
        cy.byTestId(`pending-${kind}-paginator-bottom`).should('exist');
        cy.byTestId(`pending-${kind}-truncated`).should('not.exist');
      }
    });

    it('has no accessibility violations', () => {
      cy.byTestId('pending-employees-table').scrollIntoView().should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('renders as a table at tablet breakpoint', () => {
      cy.viewport(TABLET_VIEWPORT);
      cy.reload();

      cy.byTestId('pending-users-table').should('be.visible');
      cy.byTestId('pending-users-cards').should('not.be.visible');
    });

    it('renders as a card list on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('pending-users-table').should('not.be.visible');
      cy.byTestId('pending-users-cards').should('be.visible');
      cy.byTestId('pending-households-cards').scrollIntoView().should('be.visible');
      cy.byTestId('pending-employees-cards').scrollIntoView().should('be.visible');

      cy.byTestId('pending-users-cards').within(() => {
        cy.byTestId('pending-user-link-9001').should('have.attr', 'href', '/benutzer/detail/9001');
        cy.byTestId('pending-user-overdue-9002').should('exist');
        cy.byTestId('pending-user-last-login-9002').should('contain.text', 'nie angemeldet');
      });
    });

    it('has no accessibility violations as a card list on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();
      cy.byTestId('pending-users-cards').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  describe('paging', () => {

    beforeEach(() => {
      stubPagedList('users', USERS_URL, usersList);
      stubPagedList('households', HOUSEHOLDS_URL, householdsList);
      stubPagedList('employees', EMPLOYEES_URL, employeesList);
      cy.visit(SCREEN_URL);
      cy.wait(['@users', '@households', '@employees']);
    });

    it('requests the next page of one section only, and leaves the other sections alone', () => {
      // the alias' count restarts here: only requests made from now on are counted
      cy.get('@households.all').should('have.length', 1);
      cy.get('@employees.all').should('have.length', 1);

      nextPage('users');

      cy.wait('@users').then((interception) => {
        expect(queryOf(interception)).to.deep.eq({page: '2', pageSize: '10'});
      });
      cy.byTestId('pending-users-paginator').find('.mat-mdc-paginator-range-label').should('contain.text', '11');
      cy.get('@users.all').should('have.length', 2);
      cy.get('@households.all').should('have.length', 1);
      cy.get('@employees.all').should('have.length', 1);
    });

    it('pages through the paginator below the list as well', () => {
      nextPage('households', '-bottom');

      cy.wait('@households').then((interception) => {
        expect(queryOf(interception)).to.deep.eq({page: '2', pageSize: '10'});
      });
      cy.get('@users.all').should('have.length', 1);
      cy.get('@employees.all').should('have.length', 1);
    });

    it('pages every section independently of the others', () => {
      nextPage('users');
      cy.wait('@users');
      nextPage('employees');

      cy.wait('@employees').then((interception) => {
        expect(queryOf(interception)).to.deep.eq({page: '2', pageSize: '10'});
      });
      // the users list stays on the page it was moved to
      cy.byTestId('pending-users-paginator').find('.mat-mdc-paginator-range-label').should('contain.text', '11');
      cy.get('@households.all').should('have.length', 1);
    });

    it('starts over at page 1 when the page size changes', () => {
      nextPage('users');
      cy.wait('@users').then((interception) => {
        expect(queryOf(interception)).to.deep.eq({page: '2', pageSize: '10'});
      });

      pickPageSize('users', 25);

      cy.wait('@users').then((interception) => {
        expect(queryOf(interception)).to.deep.eq({page: '1', pageSize: '25'});
      });
      cy.get('@households.all').should('have.length', 1);
      cy.get('@employees.all').should('have.length', 1);
    });

    it('has no accessibility violations with the paginators shown', () => {
      cy.byTestId('pending-employees-paginator-bottom').scrollIntoView().should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  describe('with a switched-off job', () => {

    it('says the automatic deletion is disabled, for that list only', () => {
      stubLists({users: list([], {enabled: false, totalCount: 0})});

      cy.visit(SCREEN_URL);
      cy.wait('@users');

      cy.byTestId('pending-users-disabled').should('have.text', 'Die automatische Löschung ist deaktiviert.');
      cy.byTestId('pending-users-table').should('not.exist');
      cy.byTestId('pending-users-paginator').should('not.exist');
      cy.byTestId('pending-households-table').should('be.visible');
      cy.byTestId('pending-employees-table').scrollIntoView().should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  describe('when loading one list fails', () => {

    it('shows the error and the retry in that section only, and loads it again on retry', () => {
      stubLists();
      cy.intercept('GET', USERS_URL, {statusCode: 500, body: {}}).as('failing');
      cy.visit(SCREEN_URL);
      cy.wait('@failing');

      cy.byTestId('pending-users-error').should('contain.text', 'konnten nicht geladen werden.');
      cy.byTestId('pending-users-retry').should('be.visible');
      cy.byTestId('pending-users-table').should('not.exist');
      cy.byTestId('pending-households-error').should('not.exist');
      cy.byTestId('pending-households-retry').should('not.exist');
      cy.byTestId('pending-households-table').should('be.visible');
      cy.byTestId('pending-employees-error').should('not.exist');
      cy.byTestId('pending-employees-table').scrollIntoView().should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.intercept('GET', USERS_URL, {body: usersList()}).as('recovered');
      cy.byTestId('pending-users-retry').click();
      cy.wait('@recovered');

      cy.byTestId('pending-users-error').should('not.exist');
      cy.byTestId('pending-users-table').should('be.visible');
      // the other two were not asked again
      cy.get('@households.all').should('have.length', 1);
      cy.get('@employees.all').should('have.length', 1);
    });
  });

  // The screen is for administrators only: SETTINGS opens the rest of the settings area, but not this page.
  describe('for a user with SETTINGS but without ADMINISTRATOR', () => {

    function loginAsSettingsOnlyUser() {
      cy.getAnyRandomNumber().then((randomNumber) => {
        const password = testUserPassword(randomNumber);
        const username = 'settings-only-' + randomNumber;

        cy.createUser({
          username,
          personnelNumber: 'SETONLY-' + randomNumber,
          firstname: 'firstname-' + randomNumber,
          lastname: 'lastname-' + randomNumber,
          enabled: true,
          password,
          passwordRepeat: password,
          passwordChangeRequired: false,
          permissions: [{key: 'SETTINGS', title: 'Einstellungen'}]
        }).then(() => {
          cy.login(username, password);
        });
      });
    }

    it('is turned away from the screen with the access denied message', () => {
      loginAsSettingsOnlyUser();

      cy.visit(SCREEN_URL);

      cy.url().should('contain', '/login/fehlgeschlagen');
      cy.byTestId('errorMessage').should('exist').and('contain.text', 'Zugriff nicht erlaubt');
      cy.byTestId('pending-users-section').should('not.exist');
    });

    it('still opens the other settings screens, but is not offered the menu entry', () => {
      loginAsSettingsOnlyUser();

      cy.visit('/einstellungen/mitarbeiter');
      cy.get('h1').should('contain.text', 'Mitarbeiter');

      cy.contains('button', 'Einstellungen').should('be.visible').click();
      cy.contains('a', 'Mitarbeiter').should('be.visible');
      cy.contains('a', 'Anstehende Löschungen').should('not.exist');
    });
  });

  describe('navigation', () => {

    it('is reachable from the settings menu under Systemverwaltung', () => {
      cy.visit('/uebersicht');

      // be.visible: the sidebar is still hidden for a moment after the shell appears - see general.cy.ts
      cy.contains('button', 'Einstellungen').scrollIntoView().should('be.visible').click();
      cy.contains('a', 'Anstehende Löschungen').scrollIntoView().should('be.visible').click();

      cy.location('pathname').should('eq', SCREEN_URL);
      cy.get('h1').should('contain.text', 'Anstehende Löschungen');
    });
  });
});
