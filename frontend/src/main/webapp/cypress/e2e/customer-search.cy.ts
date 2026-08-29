import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {Gender} from '../support/commands';
import {MAIN_CONTENT} from '../support/accessibility';

const AUSTRIA = {id: 165, code: 'AT', name: 'Österreich'};

describe('Customer Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/kunden/suchen');
  });

  it('shows the first results without searching', () => {
    // The testdata always contains customers, so an unfiltered first page has something in it.
    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('exist');
  });

  it('downloads the reference-less privacy notice template', () => {
    cy.intercept('/api/households/privacy-notice-template**', request => {
      request.on('response', function (response) {
        expect(response.statusCode).is.lessThan(500);
      });
    });

    cy.byTestId('downloadPrivacyNoticeTemplateButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'datenschutzerklaerung-vorlage.pdf');
    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(20000));
  });

  it('jumps straight to a customer by its exact number', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;

      cy.byTestId('searchInputText').type(customerId.toString());
      cy.byTestId('search-button').click();

      cy.url().should('include', '/kunden/detail/' + customerId);
    });
  });

  it('jumps to a customer by its exact number through Enter, without the button', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;

      cy.byTestId('searchInputText').type(customerId.toString() + '{enter}');

      cy.url().should('include', '/kunden/detail/' + customerId);
    });
  });

  // A number that appears in every dummy customer's phone number but is far larger than any
  // customer id this suite can produce - guaranteed to miss the exact-id jump and fall back to the
  // fuzzy search, which still finds it through `search_text`.
  it('falls back to the fuzzy search when a numeric query matches no customer id', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type('123456789');
      clickSearchAndOpenExpectedResult(customer.id!);
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

  it('persons column skips persons excluded from the household', () => {
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
        const customerId = response.body.data.id!;

        cy.byTestId('searchInputText').type('lastname-' + randomNumber);
        clickSearchAndWaitForResult();
        cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

        // main person + 1 included person; the excluded one is listed on the household but not counted
        cy.get(`a[href$="/kunden/detail/${customerId}"]`).filterDisplayed()
          .closest('tr')
          .find('[testid^="searchresult-personsCount-"]')
          .should('have.text', '2');
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
      clickSearchAndWaitForResult();
      // A chip toggle re-searches on its own - a separate wait for its own answer, same reasoning
      // as clickSearchAndWaitForResult above.
      cy.intercept('GET', /\/api\/households(\?|$)/).as('costContributionSearch');
      cy.byTestId('filter-costContribution').click();
      cy.wait('@costContributionSearch');

      clickSearchAndOpenExpectedResult(customerId, {alreadySearched: true});

      cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
    });
  });

  it('search by locked filter', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      cy.createCustomer({
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        country: AUSTRIA,
        validUntil: dayjs().add(1, 'year').toDate(),
        locked: true,
        lockReason: 'Testgrund-' + randomNumber,
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        }
      }).then((response) => {
        const customer = response.body.data;

        // Filter by lastname too - same reasoning as the cost-contribution filter test above: the
        // locked filter alone would depend on this being the only locked customer suite-wide.
        cy.byTestId('searchInputText').type(customer.lastname);
        clickSearchAndWaitForResult();
        cy.intercept('GET', /\/api\/households(\?|$)/).as('lockedFilterSearch');
        cy.byTestId('filter-locked').click();
        cy.wait('@lockedFilterSearch');

        clickSearchAndOpenExpectedResult(customer.id!, {alreadySearched: true});
      });
    });
  });

  it('search by missing privacy notice filter', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      // Filter by lastname too - same reasoning as the cost-contribution/locked filter tests above.
      cy.byTestId('searchInputText').type(customer.lastname);
      clickSearchAndWaitForResult();
      cy.intercept('GET', /\/api\/households(\?|$)/).as('missingPrivacyNoticeFilterSearch');
      cy.byTestId('filter-missingPrivacyNotice').click();
      cy.wait('@missingPrivacyNoticeFilterSearch');

      clickSearchAndOpenExpectedResult(customer.id!, {alreadySearched: true});
    });
  });

  // The retention window defaults to 7 years (tafeladmin.householdDeletion.retentionTime, unset
  // in application-e2e.yml) - a validUntil just past that cutoff is inside the 30-day preview the
  // chip shows, without actually being expired long enough for HouseholdRetentionService to sweep
  // it out from under a still-running suite.
  it('search by "wird bald gelöscht" filter', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      cy.createCustomer({
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        country: AUSTRIA,
        validUntil: dayjs().subtract(7, 'years').add(15, 'days').toDate(),
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        }
      }).then((response) => {
        const customer = response.body.data;

        // Filter by lastname too - same reasoning as the cost-contribution/locked filter tests above.
        cy.byTestId('searchInputText').type(customer.lastname);
        clickSearchAndWaitForResult();
        cy.intercept('GET', /\/api\/households(\?|$)/).as('willBeDeletedSoonFilterSearch');
        cy.byTestId('filter-willBeDeletedSoon').click();
        cy.wait('@willBeDeletedSoonFilterSearch');

        clickSearchAndOpenExpectedResult(customer.id!, {alreadySearched: true});
      });
    });
  });

  // A privacy notice document is stamped with whatever tafeladmin.householdDeletion.retentionTime
  // is live at upload time - to make it drift, the config genuinely has to change afterwards, the
  // same operator-edits-the-config-file mechanism customer-detail.cy.ts's scanner-folder hot-reload
  // test uses, not a fabricated database row.
  it('search by privacy notice outdated filter', () => {
    cy.task('clearBackendConfig');

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;
      const customerId = customer.id!;

      cy.visit('/kunden/detail/' + customerId);
      cy.byTestId('documents-tab-label').click();
      cy.byTestId('upload-document-panel').should('be.visible');
      cy.byTestId('documentTypeInput').click();
      cy.byTestId('documentTypeInput-option-PRIVACY_NOTICE').click();
      cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
      cy.byTestId('okButton').click();
      cy.byTestId('document-0-fileNameText').should('be.visible');

      cy.task('writeBackendConfig', ['tafeladmin:', '  householdDeletion:', '    retentionTime: 5y'].join('\n'));
      // configReload.cron polls once a second under the e2e profile - give the edit time to land
      // before the search below runs against it.
      cy.wait(1500);

      cy.visit('/kunden/suchen');
      cy.byTestId('searchInputText').type(customer.lastname);
      clickSearchAndWaitForResult();
      cy.intercept('GET', /\/api\/households(\?|$)/).as('privacyNoticeOutdatedFilterSearch');
      cy.byTestId('filter-privacyNoticeOutdated').click();
      cy.wait('@privacyNoticeOutdatedFilterSearch');

      clickSearchAndOpenExpectedResult(customerId, {alreadySearched: true});
    });

    cy.task('clearBackendConfig');
  });

  it('keeps query, filters and page after returning from a customer via the back button', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      clickSearchAndWaitForResult();
      cy.intercept('GET', /\/api\/households(\?|$)/).as('validFilterSearch');
      cy.byTestId('filter-valid').click();
      cy.wait('@validFilterSearch');

      clickSearchAndOpenExpectedResult(customer.id!, {alreadySearched: true});
      cy.url().should('include', '/kunden/detail/' + customer.id);

      cy.go('back');

      cy.url().should('include', 'suche=').and('include', 'bezugsberechtigt=true');
      cy.byTestId('searchresult-table').should('be.visible');
      cy.get(`a[href$="/kunden/detail/${customer.id}"]`).filterDisplayed().should('have.length', 1);
    });
  });

  it('shows a purposeful empty state with a prefilled "Kunden anlegen" CTA', () => {
    cy.byTestId('searchInputText').type('Zzzzvorname Zzzznachname');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-empty').should('be.visible').and('contain.text', 'Keine Kunden gefunden');
    cy.byTestId('create-customer-cta').click();

    cy.url().should('include', '/kunden/anlegen');
    // The prefilled name travels as router navigation state, not a query param - a searched name
    // must never land in the URL/browser history (GDPR gap G25).
    cy.url().should('not.include', 'vorname').and('not.include', 'nachname');
    cy.byTestId('firstnameInput').should('have.value', 'Zzzzvorname');
    cy.byTestId('lastnameInput').should('have.value', 'Zzzznachname');
  });

  it('search result renders as a card list on phone and search still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      clickSearchAndWaitForResult();

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
  it('explains the search through its info tooltip', () => {
    cy.byTestId('search-input-info-tooltip').trigger('mouseenter');

    cy.get('.mat-mdc-tooltip')
      .should('have.class', 'mat-mdc-tooltip-show')
      .and('contain.text', 'Eine reine Zahl springt bei einem exakten Treffer direkt zum Kunden');
  });

  it('labels the edit action through its tooltip', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      cy.byTestId('searchInputText').type(customer.lastname);
      cy.byTestId('search-button').click();
      cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

      cy.byTestId('searchresult-editcustomer-button-' + customer.id).filterDisplayed().trigger('mouseenter');
      cy.get('.mat-mdc-tooltip')
        .should('have.class', 'mat-mdc-tooltip-show')
        .and('contain.text', 'Kundendaten bearbeiten');
    });
  });

  // Deliberately no assertion on the number of result rows: the search is fuzzy
  // (`strict_word_similarity`, see SearchTextSpecs), and every dummy customer of a run is named
  // `lastname-<timestamp+random>`, so customers created moments apart are similar enough to each
  // other that a second, entirely correct row can show up for any of these terms (see #3102).
  // The row of the customer under test is picked by its id instead, which is unambiguous no matter
  // what else the fuzzy match surfaced.
  /**
   * Clicks "Suchen" and waits for that search's own answer.
   *
   * The screen loads the unfiltered first page on arrival and leaves it on screen while a search is
   * in flight. That list is sorted newest first, so the customer a spec just created is on it - it
   * satisfies the result assertions below before the search has answered, and is then torn out of
   * the DOM when the filtered result replaces the table, which is what a `cy.click()` on it fails
   * on. Waiting for the response ties everything after it to the result the spec asked for.
   */
  function clickSearchAndWaitForResult() {
    cy.intercept('GET', /\/api\/households(\?|$)/).as('customerSearch');
    cy.byTestId('search-button').click();
    cy.wait('@customerSearch');
  }

  function clickSearchAndOpenExpectedResult(expectedCustomerId: number, options: { alreadySearched?: boolean } = {}) {
    const {alreadySearched = false} = options;

    if (!alreadySearched) {
      clickSearchAndWaitForResult();
    }

    cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

    // The table and card list both render a link to the same href (one per branch, only one of
    // which is displayed per viewport - see 'hidden md:block' / 'block md:hidden' in the template).
    // The whole row/card is a stretched link to it (see the customer search screen's README note),
    // so the href itself - rather than a dedicated "view" button, which no longer exists - is what
    // identifies the result unambiguously.
    cy.get(`a[href$="/kunden/detail/${expectedCustomerId}"]`).filterDisplayed().should('have.length', 1);

    cy.get(`a[href$="/kunden/detail/${expectedCustomerId}"]`).filterDisplayed().click();
    cy.url().should('include', '/kunden/detail/' + expectedCustomerId);
  }

  // The Lighthouse `pages` sweep only ever grades the empty search form - it types nothing, so it
  // never sees a result list at all, in either responsive branch.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on the search result, as a table and as a card list', () => {
      cy.createDummyCustomer().then((response) => {
        const customer = response.body.data;

        cy.byTestId('searchInputText').type(customer.lastname);
        cy.byTestId('search-button').click();
        cy.byTestId('searchresult-table').should('be.visible');

        cy.checkAccessibility(MAIN_CONTENT);

        cy.viewport(PHONE_VIEWPORT);
        // the searchresult-table wrapper holds both responsive branches and stays visible -
        // what switches at phone width is which branch is displayed
        cy.byTestId('searchresult-row').should('not.be.visible');
        cy.get('[testid^="searchresult-card-"]').should('be.visible');

        cy.checkAccessibility(MAIN_CONTENT);
      });
    });

    // A live region that exists but is never filled looks exactly like a working one in any static
    // check, so what it actually says after a search is what has to be asserted.
    it('announces the number of results through a live region', () => {
      cy.createDummyCustomer().then((response) => {
        const customer = response.body.data;

        cy.byTestId('searchresult-announcement').should('exist').and('have.text', '');

        cy.byTestId('searchInputText').type(customer.lastname);
        cy.byTestId('search-button').click();
        cy.byTestId('searchresult-table').should('be.visible');

        cy.byTestId('searchresult-announcement')
          .should('have.attr', 'role', 'status')
          .and('contain.text', 'gefunden');
      });
    });

    it('announces an empty search result', () => {
      cy.byTestId('searchInputText').type('Zzzz Kein Treffer Zzzz');
      cy.byTestId('search-button').click();

      cy.byTestId('searchresult-announcement').should('have.text', 'Keine Kunden gefunden');
    });

    it('has no violations on the empty-state CTA', () => {
      cy.byTestId('searchInputText').type('Zzzz Kein Treffer Zzzz');
      cy.byTestId('search-button').click();
      cy.byTestId('searchresult-empty').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});
