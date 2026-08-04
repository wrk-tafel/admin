import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Customer Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/kunden/suchen');
  });

  it('search by customerId', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;

      cy.byTestId('customerIdText').type(customerId.toString());
      cy.byTestId('showcustomer-button').click();

      cy.url().should('include', '/kunden/detail/' + customerId);
    });
  });

  it('search by lastname and firstname', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('lastnameText').type(customer.lastname);
      cy.byTestId('firstnameText').type(customer.firstname);
      clickSearchAndOpenFirstResult(customer.id!);
    });
  });

  it('search by lastname only', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('lastnameText').type(customer.lastname);
      clickSearchAndOpenFirstResult(customer.id!);
    });
  });

  it('search by firstname only', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('firstnameText').type(customer.firstname);
      clickSearchAndOpenFirstResult(customer.id!);
    });
  });

  it('search by cost contribution', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;
      const customerId = customer.id!;
      cy.accrueCostContributionDebt(customerId);

      // Filter by lastname too - asserting on the cost-contribution filter alone would depend on
      // this being the only customer with pending debt suite-wide, which broke repeatedly when
      // other specs left dummy customers with leftover debt behind (see #2966). The randomized
      // dummy lastname combined with the cost-contribution filter narrows to just this customer
      // regardless of what other specs have accrued.
      cy.byTestId('lastnameText').type(customer.lastname);
      cy.byTestId('costContributionInput').click();
      clickSearchAndOpenFirstResult(customerId);

      cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
    });
  });

  it('search result renders as a card list on phone and search still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('lastnameText').type(customer.lastname);
      cy.byTestId('search-button').click();

      // below md: the table row is hidden and the card list is shown instead
      cy.byTestId('searchresult-row').should('exist').and('not.be.visible');

      clickSearchAndOpenFirstResult(customer.id!, true);
    });
  });

  it('search result renders as a table at tablet breakpoint and search still works', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('lastnameText').type(customer.lastname);
      clickSearchAndOpenFirstResult(customer.id!);
    });
  });

  function clickSearchAndOpenFirstResult(expectedCustomerId: number, alreadySearched = false) {
    if (!alreadySearched) {
      cy.byTestId('search-button').click();
    }

    cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 1);

    // the table and card list both render a button with this testid (one per branch, only one
    // of which is displayed per viewport - see 'hidden md:block' / 'block md:hidden' in the template)
    cy.byTestId('searchresult-showcustomer-button-0').filterDisplayed().should('have.length', 1);

    cy.byTestId('searchresult-showcustomer-button-0').filterDisplayed().click();
    cy.url().should('include', '/kunden/detail/' + expectedCustomerId);
  }

});
