import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {Gender} from '../support/commands';

const AUSTRIA = {id: 165, code: 'AT', name: 'Österreich'};

describe('Customer Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/kunden/suchen');
  });

  it('search by customerId', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;

      cy.byTestId('customerIdText').type(customerId.toString());
      cy.byTestId('showcustomer-button').click();

      cy.url().should('include', '/kunden/detail/' + customerId);
    });
  });

  it('search by name', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      clickSearchAndOpenExpectedResult(customer.id!);
    });
  });

  it('search by address', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.address!.street!);
      clickSearchAndOpenExpectedResult(customer.id!);
    });
  });

  it('search by customer number through the search field', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.id!.toString());
      clickSearchAndOpenExpectedResult(customer.id!);
    });
  });

  it('search finds the customer despite a typo in the name', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      // "lastnamr-<random>" instead of "lastname-<random>" - close enough for the fuzzy match
      cy.byTestId('searchInputText').type(customer.lastname.replace('lastname-', 'lastnamr-'));
      clickSearchAndOpenExpectedResult(customer.id!);
    });
  });

  it('search by the name of an additional household member', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const childLastname = 'child-lastname-' + randomNumber;

      cy.createCustomer({
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        telephoneNumber: '0123456789',
        email: 'firstname.lastname@test.com',
        employer: 'employer-' + randomNumber,
        country: AUSTRIA,
        income: 1000,
        incomeDue: dayjs().add(30, 'days').toDate(),
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        },
        validUntil: dayjs().add(1, 'year').toDate(),
        additionalPersons: [{
          id: 0,
          key: 0,
          firstname: 'child-firstname-' + randomNumber,
          lastname: childLastname,
          birthDate: dayjs().subtract(5, 'year').toDate(),
          gender: Gender.MALE,
          country: AUSTRIA,
          excludeFromHousehold: false,
          receivesFamilyAllowance: false
        }]
      }).then((response) => {
        cy.byTestId('searchInputText').type(childLastname);
        clickSearchAndOpenExpectedResult(response.body.data.id!);
      });
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
      cy.byTestId('searchInputText').type(customer.lastname);
      cy.byTestId('costContributionInput').click();
      clickSearchAndOpenExpectedResult(customerId);

      cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
    });
  });

  it('search result renders as a card list on phone and search still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      cy.byTestId('search-button').click();

      // below md: the table row is hidden and the card list is shown instead
      cy.byTestId('searchresult-row').should('exist').and('not.be.visible');

      clickSearchAndOpenExpectedResult(customer.id!, {alreadySearched: true});
    });
  });

  it('search result renders as a table at tablet breakpoint and search still works', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      clickSearchAndOpenExpectedResult(customer.id!);
    });
  });

  // Tooltips are deliberately not hit-testable (disableTooltipInteractivity in app.config.ts), so
  // they must not be asserted with `be.visible`: for a `position: fixed` element that check probes
  // document.elementFromPoint, which now passes straight through the tooltip and reports it as
  // "covered" by whatever sits behind it. `mat-mdc-tooltip-show` is the class Material puts on the
  // panel for as long as it is displayed, so it says the same thing without a pointer probe.
  it('explains a search filter through its info tooltip', () => {
    cy.byTestId('post-processing-info-tooltip').trigger('mouseenter');

    cy.get('.mat-mdc-tooltip')
      .should('have.class', 'mat-mdc-tooltip-show')
      .and('contain.text', 'Findet Kunden, bei denen bei einer Person Pflichtangaben fehlen');
  });

  it('labels the icon-only result buttons through their tooltip', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      cy.byTestId('search-button').click();
      cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

      cy.byTestId('searchresult-showcustomer-button-' + customer.id).filterDisplayed().trigger('mouseenter');
      cy.get('.mat-mdc-tooltip')
        .should('have.class', 'mat-mdc-tooltip-show')
        .and('contain.text', 'Kundendetails anzeigen');
    });
  });

  // Deliberately no assertion on the number of result rows: the search is fuzzy
  // (`strict_word_similarity`, see SearchTextSpecs), and every dummy customer of a run is named
  // `lastname-<timestamp+random>`, so customers created moments apart are similar enough to each
  // other that a second, entirely correct row can show up for any of these terms (see #3102).
  // The row of the customer under test is picked by its id instead, which is unambiguous no matter
  // what else the fuzzy match surfaced.
  function clickSearchAndOpenExpectedResult(expectedCustomerId: number, options: { alreadySearched?: boolean } = {}) {
    const {alreadySearched = false} = options;

    if (!alreadySearched) {
      cy.byTestId('search-button').click();
    }

    cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

    // the table and card list both render a button with this testid (one per branch, only one
    // of which is displayed per viewport - see 'hidden md:block' / 'block md:hidden' in the template)
    cy.byTestId('searchresult-showcustomer-button-' + expectedCustomerId).filterDisplayed().should('have.length', 1);

    cy.byTestId('searchresult-showcustomer-button-' + expectedCustomerId).filterDisplayed().click();
    cy.url().should('include', '/kunden/detail/' + expectedCustomerId);
  }

});
