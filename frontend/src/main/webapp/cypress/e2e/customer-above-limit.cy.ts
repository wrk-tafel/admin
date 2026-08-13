import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Customer Above Limit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a customer whose income exceeds the limit and links to their detail page', () => {
    cy.createDummyCustomer(50000, true).then((response) => {
      const customer = response.body.data;

      cy.visit('/kunden/ueber-limit');

      cy.contains('[testid^="abovelimit-id-"]', customer.id!.toString())
        .closest('tr')
        .scrollIntoView()
        .within(() => {
          cy.get('[testid^="abovelimit-name-"]').should('contain.text', customer.lastname).and('contain.text', customer.firstname);
          cy.get('[testid^="abovelimit-address-"]').should('contain.text', customer.address.city);
          cy.get('[testid^="abovelimit-totalSum-"]').should('be.visible');
          cy.get('[testid^="abovelimit-limit-"]').should('be.visible');
          cy.get('[testid^="abovelimit-amountExceededLimit-"]')
            .should('be.visible')
            .invoke('text')
            .should('not.be.empty');
          cy.get('[testid^="abovelimit-percentageExceededLimit-"]')
            .should('be.visible')
            .invoke('text')
            .should('contain', '%');

          // the table row and the equivalent card (below md:) both render a link with this
          // testid - .closest('tr') above already scopes this to the (visible) table row's copy
          cy.get('[testid^="abovelimit-showcustomer-button-"]')
            .should('have.attr', 'href', '/kunden/detail/' + customer.id)
            .click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('shows what the list was checked against', () => {
    cy.visit('/kunden/ueber-limit');

    cy.contains('Stand: ' + dayjs().format('DD.MM.YYYY')).should('be.visible');
    // the default e2e user holds the SETTINGS permission, so the Grenzwerte link is rendered
    cy.byTestId('abovelimit-limits-link')
      .should('have.attr', 'href', '/einstellungen/statische-werte');
  });

  it('sorts by clicking a money column header', () => {
    cy.intercept('GET', '/api/households/above-limit*').as('aboveLimit');

    // guarantees at least one row so the sortable table (rather than the empty state) is rendered,
    // independent of what any other test left behind in the shared e2e database
    cy.createDummyCustomer(50000, true).then(() => {
      cy.visit('/kunden/ueber-limit');
      cy.wait('@aboveLimit');

      cy.contains('th', 'Einkommen gesamt').click();
      cy.wait('@aboveLimit').its('request.url').should('include', 'sortBy=totalSum').and('include', 'sortDirection=asc');

      cy.contains('th', 'Einkommen gesamt').click();
      cy.wait('@aboveLimit').its('request.url').should('include', 'sortBy=totalSum').and('include', 'sortDirection=desc');
    });
  });

  it('exports the current list as csv', () => {
    cy.createDummyCustomer(50000, true).then(() => {
      cy.visit('/kunden/ueber-limit');

      cy.byTestId('abovelimit-csv-export-button').click();

      const downloadsFolder = Cypress.config('downloadsFolder');
      const today = dayjs().format('DD.MM.YYYY');
      const downloadedFilename = path.join(downloadsFolder, `kunden_ueber_limit_${today}.csv`);

      cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
        .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));
    });
  });

  it('renders the card list on phone and still links to the customer detail page', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyCustomer(50000, true).then((response) => {
      const customer = response.body.data;

      cy.visit('/kunden/ueber-limit');

      // below md: the table is hidden and the card list is shown instead
      cy.get('[testid^="abovelimit-id-"]').should('exist').and('not.be.visible');

      cy.contains('mat-card', customer.lastname)
        .scrollIntoView()
        .should('be.visible')
        .within(() => {
          // the table row and the card both render a link with this testid - filter to the
          // one that's actually displayed in this (card) branch
          cy.get('[testid^="abovelimit-showcustomer-button-"]').filterDisplayed().should('have.length', 1).click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('renders the desktop-style table at tablet breakpoint and still links to the customer detail page', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.createDummyCustomer(50000, true).then((response) => {
      const customer = response.body.data;

      cy.visit('/kunden/ueber-limit');

      cy.contains('[testid^="abovelimit-id-"]', customer.id!.toString())
        .closest('tr')
        .within(() => {
          cy.get('[testid^="abovelimit-showcustomer-button-"]').filterDisplayed().should('have.length', 1).click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('explains the empty state positively when nobody is above the limit', () => {
    // stubbed rather than relying on an actually-empty database: other tests in this run share the
    // same backend and may have already created households above the limit
    cy.intercept('GET', '/api/households/above-limit*', {
      items: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
      pageSize: 10
    }).as('aboveLimit');

    cy.visit('/kunden/ueber-limit');
    cy.wait('@aboveLimit');

    cy.contains('Aktuell liegt kein Kunde über dem Limit').should('be.visible');
  });

  // The card list is a different DOM from the table, and the Lighthouse `pages` sweep grades this
  // route at the desktop and mobile form factors of the same markup only.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on the card list', () => {
      cy.viewport(PHONE_VIEWPORT);

      cy.createDummyCustomer(50000, true).then((response) => {
        cy.visit('/kunden/ueber-limit');
        cy.contains('mat-card', response.body.data.lastname).should('be.visible');

        cy.checkAccessibility(MAIN_CONTENT);
      });
    });

  });

});
