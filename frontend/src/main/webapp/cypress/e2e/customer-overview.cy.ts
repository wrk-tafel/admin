import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Customer Overview', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a newly created customer under "Neu" and links to their detail page', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.visit('/kunden/uebersicht');

      cy.contains('[testid^="overview-new-id-"]', customer.id!.toString())
        .closest('tr')
        .scrollIntoView()
        .within(() => {
          cy.get('[testid^="overview-new-name-"]').should('contain.text', customer.lastname).and('contain.text', customer.firstname);
          cy.get('[testid^="overview-new-address-"]').should('contain.text', customer.address.city);
          cy.get('[testid^="overview-new-date-"]').should('be.visible');

          // the table row and the equivalent card (below md:) both render a button with this
          // testid - .closest('tr') above already scopes this to the (visible) table row's copy
          cy.get('[testid^="overview-new-showcustomer-button-"]').click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);

      cy.closeDistribution();
    });
  });

  it('lists a customer whose validity was extended under "Verlängert"', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;
      const extendedValidUntil = dayjs(customer.validUntil).add(1, 'year').toDate();

      cy.updateCustomer({...customer, validUntil: extendedValidUntil}).then(() => {
        cy.visit('/kunden/uebersicht');

        cy.contains('[testid^="overview-renewed-id-"]', customer.id!.toString())
          .closest('tr')
          .scrollIntoView()
          .within(() => {
            cy.get('[testid^="overview-renewed-name-"]').should('contain.text', customer.lastname).and('contain.text', customer.firstname);
            cy.get('[testid^="overview-renewed-showcustomer-button-"]').click();
          });

        cy.url().should('include', '/kunden/detail/' + customer.id);

        cy.closeDistribution();
      });
    });
  });

  it('reloads the overview when a different distribution is selected', () => {
    // the selector only ever lists closed distributions (the currently open one is what "no
    // selection" already shows by default) - capture the id directly from the create response
    // rather than guessing its position in a list that accumulates across the whole e2e run
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const firstDistributionId = createResponse.body.distribution.id;

      cy.createDummyCustomer().then((firstResponse) => {
        const firstCustomer = firstResponse.body.data;
        cy.closeDistribution();

        cy.createDistribution();
        cy.createDummyCustomer().then((secondResponse) => {
          const secondCustomer = secondResponse.body.data;

          cy.visit('/kunden/uebersicht');

          // defaults to the latest (still open) distribution
          cy.contains('[testid^="overview-new-id-"]', secondCustomer.id!.toString()).should('exist');
          cy.contains('[testid^="overview-new-id-"]', firstCustomer.id!.toString()).should('not.exist');

          cy.byTestId('overviewDistributionInput').click();
          cy.byTestId('overviewDistributionInput-option-' + firstDistributionId).click();

          cy.contains('[testid^="overview-new-id-"]', firstCustomer.id!.toString()).should('exist');
          cy.contains('[testid^="overview-new-id-"]', secondCustomer.id!.toString()).should('not.exist');

          cy.closeDistribution();
        });
      });
    });
  });

  it('renders the card list on phone and still links to the customer detail page', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.visit('/kunden/uebersicht');

      // below md: the table is hidden and the card list is shown instead
      cy.get('[testid^="overview-new-id-"]').should('exist').and('not.be.visible');

      cy.contains('mat-card', customer.lastname)
        .scrollIntoView()
        .should('be.visible')
        .within(() => {
          // the table row and the card both render a button with this testid - filter to the
          // one that's actually displayed in this (card) branch
          cy.get('[testid^="overview-new-showcustomer-button-"]').filterDisplayed().should('have.length', 1).click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);

      cy.closeDistribution();
    });
  });

  it('renders the desktop-style table at tablet breakpoint and still links to the customer detail page', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.visit('/kunden/uebersicht');

      cy.contains('[testid^="overview-new-id-"]', customer.id!.toString())
        .closest('tr')
        .within(() => {
          cy.get('[testid^="overview-new-showcustomer-button-"]').filterDisplayed().should('have.length', 1).click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);

      cy.closeDistribution();
    });
  });

});
