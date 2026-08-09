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

          // the table row and the equivalent card (below md:) both render a button with this
          // testid - .closest('tr') above already scopes this to the (visible) table row's copy
          cy.get('[testid^="abovelimit-showcustomer-button-"]').click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
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
          // the table row and the card both render a button with this testid - filter to the
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
