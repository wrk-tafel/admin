import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {Gender} from '../support/commands';
import {MAIN_CONTENT} from '../support/accessibility';

const AUSTRIA = {id: 165, code: 'AT', name: 'Österreich'};

describe('Customer Overview', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a newly created customer under "Neu" with a type chip and links to their detail page', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      // the overview defaults to the newest closed distribution - close before visiting
      cy.closeDistribution();
      cy.visit('/kunden/uebersicht');

      cy.contains('[testid^="overview-id-"]', customer.id!.toString())
        .closest('tr')
        .scrollIntoView()
        .within(() => {
          cy.get('[testid^="overview-type-"]').should('contain.text', 'Neu');
          cy.get('[testid^="overview-name-"]').should('contain.text', customer.lastname).and('contain.text', customer.firstname);
          cy.get('[testid^="overview-address-"]').should('contain.text', customer.address.city);
          cy.get('[testid^="overview-persons-"]').should('contain.text', '1');
          cy.get('[testid^="overview-validity-"]').should('contain.text', 'Gültig');
          cy.get('[testid^="overview-date-"]').should('be.visible');

          // the table row and the equivalent card (below md:) both render a button with this
          // testid - .closest('tr') above already scopes this to the (visible) table row's copy
          cy.get('[testid^="overview-showcustomer-button-"]').click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('persons column skips persons excluded from the household', () => {
    cy.createDistribution();

    cy.getAnyRandomNumber().then(randomNumber => {
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
        additionalPersons: [
          {
            id: 0,
            key: 0,
            firstname: 'child-firstname-' + randomNumber,
            lastname: 'child-lastname-' + randomNumber,
            birthDate: dayjs().subtract(5, 'year').toDate(),
            gender: Gender.MALE,
            country: AUSTRIA,
            excludeFromHousehold: false,
            receivesFamilyAllowance: false
          },
          {
            id: 0,
            key: 1,
            firstname: 'excluded-firstname-' + randomNumber,
            lastname: 'excluded-lastname-' + randomNumber,
            birthDate: dayjs().subtract(10, 'year').toDate(),
            gender: Gender.FEMALE,
            country: AUSTRIA,
            excludeFromHousehold: true,
            receivesFamilyAllowance: false
          }
        ]
      }).then((response) => {
        const customer = response.body.data;

        cy.closeDistribution();
        cy.visit('/kunden/uebersicht');

        // main person + 1 included person; the excluded one is listed on the household but not counted
        cy.contains('[testid^="overview-id-"]', customer.id!.toString())
          .closest('tr')
          .scrollIntoView()
          .within(() => {
            cy.get('[testid^="overview-persons-"]').should('contain.text', '2');
          });
      });
    });
  });

  it('lists a customer whose validity was extended under "Verlängert" with a type chip', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;
      const extendedValidUntil = dayjs(customer.validUntil).add(1, 'year').toDate();

      cy.updateCustomer({...customer, validUntil: extendedValidUntil}).then(() => {
        cy.closeDistribution();
        cy.visit('/kunden/uebersicht');

        cy.byTestId('overview-type-filter-renewed').click();

        cy.contains('[testid^="overview-id-"]', customer.id!.toString())
          .closest('tr')
          .scrollIntoView()
          .within(() => {
            cy.get('[testid^="overview-type-"]').should('contain.text', 'Verlängert');
            cy.get('[testid^="overview-name-"]').should('contain.text', customer.lastname).and('contain.text', customer.firstname);
            cy.get('[testid^="overview-showcustomer-button-"]').click();
          });

        cy.url().should('include', '/kunden/detail/' + customer.id);
      });
    });
  });

  it('leads with the new/renewed counts as stat tiles', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((firstResponse) => {
      const firstCustomer = firstResponse.body.data;

      cy.createDummyCustomer().then((secondResponse) => {
        const secondCustomer = secondResponse.body.data;
        const extendedValidUntil = dayjs(secondCustomer.validUntil).add(1, 'year').toDate();

        // created and prolonged within the same distribution window - counts under both lists
        cy.updateCustomer({...secondCustomer, validUntil: extendedValidUntil}).then(() => {
          cy.closeDistribution();
          cy.visit('/kunden/uebersicht');

          cy.byTestId('overview-stat-new-count').should('contain.text', '2');
          cy.byTestId('overview-stat-renewed-count').should('contain.text', '1');

          cy.contains('[testid^="overview-id-"]', firstCustomer.id!.toString()).should('exist');
          cy.contains('[testid^="overview-id-"]', secondCustomer.id!.toString()).should('exist');
        });
      });
    });
  });

  it('filters the merged list with the segmented Alle/Neu/Verlängert control', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((newOnlyResponse) => {
      const newOnlyCustomer = newOnlyResponse.body.data;

      cy.createDummyCustomer().then((renewedResponse) => {
        const renewedCustomer = renewedResponse.body.data;
        const extendedValidUntil = dayjs(renewedCustomer.validUntil).add(1, 'year').toDate();

        cy.updateCustomer({...renewedCustomer, validUntil: extendedValidUntil}).then(() => {
          cy.closeDistribution();
          cy.visit('/kunden/uebersicht');

          cy.byTestId('overview-type-filter-new').click();
          cy.contains('[testid^="overview-id-"]', newOnlyCustomer.id!.toString()).should('exist');

          cy.byTestId('overview-type-filter-renewed').click();
          cy.contains('[testid^="overview-id-"]', renewedCustomer.id!.toString()).should('exist');

          cy.byTestId('overview-type-filter-all').click();
          cy.contains('[testid^="overview-id-"]', newOnlyCustomer.id!.toString()).should('exist');
          cy.contains('[testid^="overview-id-"]', renewedCustomer.id!.toString()).should('exist');
        });
      });
    });
  });

  it('defaults to the newest closed distribution and reloads when a different one is selected', () => {
    // capture the id directly from the create response rather than guessing its position in a
    // list that accumulates across the whole e2e run
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const firstDistributionId = createResponse.body.distribution.id;

      cy.createDummyCustomer().then((firstResponse) => {
        const firstCustomer = firstResponse.body.data;
        cy.closeDistribution();

        cy.createDistribution();
        cy.createDummyCustomer().then((secondResponse) => {
          const secondCustomer = secondResponse.body.data;
          cy.closeDistribution();

          cy.visit('/kunden/uebersicht');

          // defaults to the newest closed distribution, with its date visible in the field - an
          // autocomplete input, so its value (not its text content) carries the current selection
          cy.byTestId('overviewDistributionInput')
            .invoke('val').should('match', /\S+, \d{2}\.\d{2}\.\d{4}/);
          cy.contains('[testid^="overview-id-"]', secondCustomer.id!.toString()).should('exist');
          cy.contains('[testid^="overview-id-"]', firstCustomer.id!.toString()).should('not.exist');

          cy.byTestId('overviewDistributionInput').click();
          // the weekday is what tells the distributions apart in the list
          cy.byTestId('overviewDistributionInput-option-' + firstDistributionId)
            .invoke('text').should('match', /^\S+, \d{2}\.\d{2}\.\d{4}$/);
          cy.byTestId('overviewDistributionInput-option-' + firstDistributionId).click();

          cy.contains('[testid^="overview-id-"]', firstCustomer.id!.toString()).should('exist');
          cy.contains('[testid^="overview-id-"]', secondCustomer.id!.toString()).should('not.exist');
        });
      });
    });
  });

  it('steps through distributions with the prev/next arrows', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then((firstResponse) => {
      const firstCustomer = firstResponse.body.data;
      cy.closeDistribution();

      cy.createDistribution();
      cy.createDummyCustomer().then((secondResponse) => {
        const secondCustomer = secondResponse.body.data;
        cy.closeDistribution();

        cy.visit('/kunden/uebersicht');

        // defaults to the newest closed distribution - "newer" is already disabled
        cy.byTestId('overview-distribution-next-button').should('be.disabled');
        cy.contains('[testid^="overview-id-"]', secondCustomer.id!.toString()).should('exist');

        cy.byTestId('overview-distribution-prev-button').click();

        cy.contains('[testid^="overview-id-"]', firstCustomer.id!.toString()).should('exist');
        cy.byTestId('overview-distribution-next-button').should('not.be.disabled');

        cy.byTestId('overview-distribution-next-button').click();

        cy.contains('[testid^="overview-id-"]', secondCustomer.id!.toString()).should('exist');
        cy.byTestId('overview-distribution-next-button').should('be.disabled');
      });
    });
  });

  it('exports the selected distribution\'s list as csv', () => {
    cy.createDistribution();

    cy.createDummyCustomer().then(() => {
      cy.closeDistribution();
      cy.visit('/kunden/uebersicht');

      cy.byTestId('overview-csv-export-button').click();

      const downloadsFolder = Cypress.config('downloadsFolder');
      const today = dayjs().format('YYYY-MM-DD');
      const downloadedFilename = path.join(downloadsFolder, `kunden-uebersicht_${today}.csv`);

      cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
        .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));
    });
  });

  it('renders the card list on phone and still links to the customer detail page', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.closeDistribution();
      cy.visit('/kunden/uebersicht');

      // below md: the table is hidden and the card list is shown instead
      cy.get('[testid^="overview-id-"]').should('exist').and('not.be.visible');

      cy.contains('mat-card', customer.lastname)
        .scrollIntoView()
        .should('be.visible')
        .within(() => {
          // the table row and the card both render a button with this testid - filter to the
          // one that's actually displayed in this (card) branch
          cy.get('[testid^="overview-showcustomer-button-"]').filterDisplayed().should('have.length', 1).click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('renders the desktop-style table at tablet breakpoint and still links to the customer detail page', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.createDistribution();

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.closeDistribution();
      cy.visit('/kunden/uebersicht');

      cy.contains('[testid^="overview-id-"]', customer.id!.toString())
        .closest('tr')
        .within(() => {
          cy.get('[testid^="overview-showcustomer-button-"]').filterDisplayed().should('have.length', 1).click();
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
      cy.createDistribution();

      cy.createDummyCustomer().then((response) => {
        cy.closeDistribution();
        cy.visit('/kunden/uebersicht');
        cy.contains('mat-card', response.body.data.lastname).scrollIntoView().should('be.visible');

        cy.checkAccessibility(MAIN_CONTENT);
      });
    });

    it('has no violations with the distribution autocomplete open', () => {
      cy.createDistribution();

      cy.createDummyCustomer().then(() => {
        cy.closeDistribution();
        cy.visit('/kunden/uebersicht');

        cy.byTestId('overviewDistributionInput').click();
        cy.checkAutocompleteAccessibility();
      });
    });

  });

});
