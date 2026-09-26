import dayjs from 'dayjs';
import {MAIN_CONTENT} from '../support/accessibility';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

const PENDING_DELETIONS_URL = '/api/settings/pending-deletions';
const SCREEN_URL = '/einstellungen/anstehende-loeschungen';

// What the backend answers when a job has something due: one entry per kind that is still to come,
// one already due and one that never had a login / never was used. Dates relative to today, since
// the "Fällig" chip is decided against the current date.
function populatedResponse(options: { truncated: boolean } = {truncated: false}) {
  const inTenDays = dayjs().add(10, 'day').format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  return {
    users: {
      enabled: true,
      retentionText: '1 Jahr',
      warningText: '30 Tagen',
      totalCount: options.truncated ? 250 : 2,
      items: [
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
      ]
    },
    households: {
      enabled: true,
      retentionText: '7 Jahren',
      warningText: '30 Tagen',
      totalCount: 2,
      items: [
        {householdId: 7001, name: 'Beispiel Berta', validUntil: '2019-05-31', deletionDate: inTenDays},
        {householdId: 7002, name: null, validUntil: '2019-04-30', deletionDate: yesterday}
      ]
    },
    employees: {
      enabled: true,
      retentionText: '1 Jahr',
      warningText: '30 Tagen',
      totalCount: 2,
      items: [
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
      ]
    }
  };
}

function disabledList(retentionText: string) {
  return {enabled: false, retentionText, warningText: '30 Tagen', totalCount: 0, items: []};
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
    it('lists what is due and says per section when nothing is', () => {
      cy.visit(SCREEN_URL);

      // no account or driver of the e2e data has gone unused for a year
      cy.byTestId('pending-users-section').should('be.visible').invoke('text')
        .should('match', /Keine Benutzerkonten in den nächsten .+ fällig\.|Die automatische Löschung ist deaktiviert\./);
      cy.byTestId('pending-employees-section').invoke('text')
        .should('match', /Keine Mitarbeiter in den nächsten .+ fällig\.|Die automatische Löschung ist deaktiviert\./);

      // the e2e data holds a customer whose validity ended in the year 2000, long past its retention time
      cy.byTestId('pending-households-section').invoke('text').then((text) => {
        expect(text).to.match(/Die automatische Löschung ist deaktiviert\.|ABGELAUFEN Herta/);
      });
      cy.byTestId('pending-household-overdue-104').should('exist');
    });

    it('has no accessibility violations', () => {
      cy.visit(SCREEN_URL);
      cy.byTestId('pending-employees-section').scrollIntoView().should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  describe('with due deletions', () => {

    beforeEach(() => {
      cy.intercept('GET', PENDING_DELETIONS_URL, {body: populatedResponse({truncated: true})}).as('pendingDeletions');
      cy.visit(SCREEN_URL);
      cy.wait('@pendingDeletions');
    });

    it('explains each list with its retention and warning texts', () => {
      cy.byTestId('pending-users-description').should('contain.text',
        'Benutzerkonten werden nach 1 Jahr ohne Anmeldung automatisch gelöscht - '
        + 'hier stehen die, bei denen das in den nächsten 30 Tagen passiert.');
      cy.byTestId('pending-households-description').should('contain.text',
        'Kunden werden nach 7 Jahren seit Ablauf der Gültigkeit automatisch gelöscht');
      cy.byTestId('pending-employees-description').should('contain.text',
        'Mitarbeiter werden nach 1 Jahr ohne Einsatz als Fahrer:in automatisch gelöscht');
    });

    it('lists the accounts, linking each to its detail view', () => {
      cy.byTestId('pending-users-heading').should('contain.text', 'Benutzerkonten (250)');

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

    it('hints that only the first entries of a truncated list are shown', () => {
      cy.byTestId('pending-users-truncated').should('have.text', 'Es werden die ersten 2 von 250 angezeigt.');
      cy.byTestId('pending-households-truncated').should('not.exist');
      cy.byTestId('pending-employees-truncated').should('not.exist');
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
      cy.byTestId('pending-users-cards').scrollIntoView();

      cy.byTestId('pending-users-cards').within(() => {
        cy.byTestId('pending-user-link-9001').should('be.visible').and('have.attr', 'href', '/benutzer/detail/9001');
        cy.byTestId('pending-user-overdue-9002').should('be.visible');
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

  describe('with a switched-off job', () => {

    it('says the automatic deletion is disabled, for that list only', () => {
      const response = populatedResponse();
      cy.intercept('GET', PENDING_DELETIONS_URL, {
        body: {...response, users: disabledList('1 Jahr')}
      }).as('pendingDeletions');

      cy.visit(SCREEN_URL);
      cy.wait('@pendingDeletions');

      cy.byTestId('pending-users-disabled').should('have.text', 'Die automatische Löschung ist deaktiviert.');
      cy.byTestId('pending-users-table').should('not.exist');
      cy.byTestId('pending-households-table').should('be.visible');
      cy.byTestId('pending-employees-table').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  describe('without permission for a kind of record', () => {

    it('shows only the sections the backend sent', () => {
      const response = populatedResponse();
      cy.intercept('GET', PENDING_DELETIONS_URL, {
        body: {users: null, households: null, employees: response.employees}
      }).as('pendingDeletions');

      cy.visit(SCREEN_URL);
      cy.wait('@pendingDeletions');

      cy.byTestId('pending-employees-section').should('be.visible');
      cy.byTestId('pending-users-section').should('not.exist');
      cy.byTestId('pending-households-section').should('not.exist');
    });
  });

  describe('when loading fails', () => {

    it('shows an error and loads again on retry', () => {
      cy.intercept('GET', PENDING_DELETIONS_URL, {statusCode: 500, body: {}}).as('failing');
      cy.visit(SCREEN_URL);
      cy.wait('@failing');

      cy.byTestId('pending-deletions-error').should('contain.text', 'Die anstehenden Löschungen konnten nicht geladen werden.');
      cy.byTestId('pending-users-section').should('not.exist');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.intercept('GET', PENDING_DELETIONS_URL, {body: populatedResponse()}).as('recovered');
      cy.byTestId('pending-deletions-retry').click();
      cy.wait('@recovered');

      cy.byTestId('pending-deletions-error').should('not.exist');
      cy.byTestId('pending-users-section').should('be.visible');
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
