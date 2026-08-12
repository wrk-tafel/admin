import dayjs from 'dayjs';
import {PHONE_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

const isoToday = () => dayjs().format('YYYY-MM-DD');
const isoLastMonth = () => dayjs().subtract(1, 'month').format('YYYY-MM-DD');

/**
 * The testdata is loaded as plain SQL and therefore leaves no audit entries behind - every test
 * here creates the change it then expects to find, which is also the only honest way to prove the
 * trail records anything.
 */
describe('Änderungsprotokoll', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('opens preselected on customers over the last month', () => {
    cy.createDummyCustomer().then(() => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-filter-entityType').should('contain.text', 'Kunde');
      cy.byTestId('audit-filter-to').should('have.value', isoToday());
      cy.byTestId('audit-filter-from').should('have.value', isoLastMonth());

      cy.byTestId('audit-entry-list').should('exist');
      cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Kunde');
    });
  });

  it('records a newly created customer and shows it in the log', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;

      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-filter-businessKey').type(String(customerId));
      // Creating a customer writes an insert and then an update (the main-person pointer can only
      // be set once both rows exist), so the newest entry is the update - filter to pin the assertion.
      cy.byTestId('audit-filter-operation').click();
      cy.get('mat-option').contains('Angelegt').click();

      cy.byTestId('audit-entry-list').should('exist');
      cy.byTestId('audit-entry-0-operation').should('contain.text', 'Angelegt');
      cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Kunde');
      cy.byTestId('audit-entry-0-businessKey').should('contain.text', String(customerId));
      // the account that made the change, plus the name behind it
      cy.byTestId('audit-entry-0-actor').should('have.text', 'e2etest (E2E Test)');
    });
  });

  it('records what an edit changed, with the previous value', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.updateCustomer({...customer, telephoneNumber: '0699111222'});

      cy.visit('/aenderungsprotokoll');
      cy.byTestId('audit-filter-businessKey').type(String(customer.id));
      cy.byTestId('audit-filter-operation').click();
      cy.get('mat-option').contains('Geändert').click();

      cy.byTestId('audit-entry-0-changes').should('contain.text', 'Telefon');
      cy.byTestId('audit-entry-0-changes').should('contain.text', '0123456789');
      cy.byTestId('audit-entry-0-changes').should('contain.text', '0699111222');
    });
  });

  it('groups the entries under the day they happened on', () => {
    cy.createDummyCustomer().then(() => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-day-0-relative').should('have.text', 'Heute');
      cy.byTestId('audit-day-0-date').should('contain.text', dayjs().format('DD.MM.YYYY'));
    });
  });

  it('opens the customer an entry is about', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;

      cy.visit('/aenderungsprotokoll');

      // The newest entry is the customer just created, so no filter is needed to reach it - and
      // clicking through one would mean clicking a link a pending re-render can still replace.
      cy.byTestId('audit-entry-0-businessKey').should('contain.text', String(customerId)).click();

      cy.url().should('include', `/kunden/detail/${customerId}`);
    });
  });

  describe('filtering', () => {

    it('filters by record type without a separate search step, and resetting returns to the defaults', () => {
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-filter-entityType').click();
        cy.get('mat-option').contains('Person').click();
        cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Person');

        cy.byTestId('audit-reset-button').click();
        cy.byTestId('audit-filter-entityType').should('contain.text', 'Kunde');
        cy.byTestId('audit-filter-from').should('have.value', isoLastMonth());
        cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Kunde');
      });
    });

    it('offers the users the log holds entries for, instead of asking for one to be typed', () => {
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-filter-actor').click();
        cy.get('mat-option').contains('e2etest (E2E Test)').click();

        cy.byTestId('audit-filter-actor').should('have.value', 'e2etest');
        cy.byTestId('audit-entry-0-actor').should('have.text', 'e2etest (E2E Test)');
        cy.url().should('include', 'benutzer=e2etest');
      });
    });

    // A username the filter would match nothing for must not end up applied - an empty log reads
    // as "nothing was changed", which is the one wrong answer this screen must not give.
    it('does not filter on a half-typed user', () => {
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-filter-actor').type('e2e');

        cy.byTestId('audit-entry-list').should('exist');
        cy.url().should('not.include', 'benutzer=');
      });
    });

    it('sets a date range from a preset', () => {
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-filter-preset-heute').click();

        cy.byTestId('audit-filter-from').should('have.value', isoToday());
        cy.byTestId('audit-filter-to').should('have.value', isoToday());
        cy.byTestId('audit-filter-preset-heute').should('have.attr', 'aria-pressed', 'true');
        cy.byTestId('audit-entry-list').should('exist');
      });
    });

    it('carries the filter in the URL, so a finding can be linked to', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        cy.visit('/aenderungsprotokoll');
        cy.byTestId('audit-filter-businessKey').type(String(customerId));
        cy.url().should('include', `nummer=${customerId}`);

        // What a colleague opening the link gets: the same filter, not the screen's defaults.
        cy.visit(`/aenderungsprotokoll?art=Person&aenderung=&benutzer=&nummer=${customerId}&von=&bis=`);

        cy.byTestId('audit-filter-entityType').should('contain.text', 'Person');
        cy.byTestId('audit-filter-businessKey').should('have.value', String(customerId));
        cy.byTestId('audit-filter-from').should('have.value', '');
        cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Person');
      });
    });

    it('says so when nothing matches the filter', () => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-filter-businessKey').type('999999999');

      cy.byTestId('audit-log-empty').should('be.visible');
      cy.byTestId('audit-entry-list').should('not.exist');
    });
  });

  it('shows a paginator once there are entries', () => {
    cy.createDummyCustomer().then(() => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-log-paginator').should('exist');
    });
  });

  it('stays usable on a phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.createDummyCustomer().then((response) => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-filter-businessKey').type(String(response.body.data.id));

      cy.byTestId('audit-entry-0-operation').should('be.visible');
    });
  });

  // The Lighthouse `pages` sweep grades this route's initial render; what it cannot reach is the
  // state after a filter has been applied, or an open select - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations once entries are listed', () => {
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-entry-list').should('exist');
        cy.checkAccessibility(MAIN_CONTENT);
      });
    });

    it('has no violations with the filter selects open', () => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-filter-entityType').click();
      cy.checkSelectAccessibility();
      cy.get('body').type('{esc}');

      cy.byTestId('audit-filter-operation').click();
      cy.checkSelectAccessibility();
    });

    it('has no violations with the user list open', () => {
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-filter-actor').click();
        cy.checkAutocompleteAccessibility();
      });
    });

    it('has no violations on the empty result', () => {
      cy.visit('/aenderungsprotokoll');

      cy.byTestId('audit-filter-businessKey').type('999999999');

      cy.byTestId('audit-log-empty').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations on a phone, where the change tables scroll sideways', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.createDummyCustomer().then(() => {
        cy.visit('/aenderungsprotokoll');

        cy.byTestId('audit-entry-list').should('exist');
        cy.checkAccessibility(MAIN_CONTENT);
      });
    });

  });

  it('is reachable from the navigation menu', () => {
    cy.visit('/uebersicht');

    cy.get('a[href="/aenderungsprotokoll"]').first().click({force: true});

    cy.url().should('include', '/aenderungsprotokoll');
  });
});
