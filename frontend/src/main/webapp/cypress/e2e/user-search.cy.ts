import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';
import {testUserPassword} from '../support/commands';

describe('User Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/benutzer/suchen');
  });

  it('shows the first results without searching', () => {
    // The testdata always contains active users, so the default "Aktiv" filter has something in it.
    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('exist');
  });

  it('jumps straight to a user by its exact personnel number', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.personnelNumber);
      cy.byTestId('search-button').click();

      cy.url().should('include', '/benutzer/detail/' + user.id);
    });
  });

  it('jumps to a user by its exact personnel number through Enter, without the button', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.personnelNumber + '{enter}');

      cy.url().should('include', '/benutzer/detail/' + user.id);
    });
  });

  // One digit longer than the real personnel number - guaranteed to miss the exact-match jump, but
  // close enough for the fuzzy fallback to still find it via `search_text` (same tolerance as the
  // typo test below).
  it('falls back to the fuzzy search when a numeric query nearly matches a personnel number', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.personnelNumber + '9');
      clickSearchAndOpenExpectedResult(user.id!);
    });
  });

  it('search by name', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndOpenExpectedResult(user.id!);
    });
  });

  it('search by username', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.username);
      clickSearchAndOpenExpectedResult(user.id!);
    });
  });

  it('search finds the user despite a typo in the name', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      // "lastnamr-<random>" instead of "lastname-<random>" - close enough for the fuzzy match
      cy.byTestId('searchInputText').type(user.lastname.replace('lastname-', 'lastnamr-'));
      clickSearchAndOpenExpectedResult(user.id!);
    });
  });

  it('search by status filter', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;
      cy.request('PUT', `/api/users/${user.id}`, {...user, enabled: false});

      // Filter by lastname too - narrowing to just this user regardless of what other specs left
      // behind, same reasoning as the customer search's cost-contribution filter test.
      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndWaitForResult();
      cy.intercept('GET', /\/api\/users(\?|$)/).as('statusFilterSearch');
      cy.byTestId('status-filter-deaktiviert').click();
      cy.wait('@statusFilterSearch');

      clickSearchAndOpenExpectedResult(user.id!, {alreadySearched: true});
    });
  });

  it('keeps query, status and page after returning from a user via the back button', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndWaitForResult();
      cy.intercept('GET', /\/api\/users(\?|$)/).as('statusFilterSearch');
      cy.byTestId('status-filter-alle').click();
      cy.wait('@statusFilterSearch');

      clickSearchAndOpenExpectedResult(user.id!, {alreadySearched: true});
      cy.url().should('include', '/benutzer/detail/' + user.id);

      cy.go('back');

      cy.url().should('include', 'suche=').and('include', 'status=alle');
      cy.byTestId('searchresult-table').should('be.visible');
      cy.get(`a[href$="/benutzer/detail/${user.id}"]`).filterDisplayed().should('have.length', 1);
    });
  });

  it('shows a purposeful empty state with a "Benutzer anlegen" CTA', () => {
    cy.byTestId('searchInputText').type('Zzzzusername Zzzznachname');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-empty').should('be.visible').and('contain.text', 'Keine Benutzer gefunden');
    cy.byTestId('create-user-cta').click();

    cy.url().should('include', '/benutzer/erstellen');
  });

  it('shows the status chips in the result row, including passwordChangeRequired', () => {
    cy.getAnyRandomNumber().then((randomNumber) => {
      cy.createUser({
        username: 'username-' + randomNumber,
        personnelNumber: randomNumber.toString(),
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: testUserPassword(randomNumber),
        passwordChangeRequired: true,
        permissions: []
      }).then((response) => {
        const user = response.body;

        cy.byTestId('searchInputText').type(user.lastname);
        clickSearchAndWaitForResult();

        cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');
        cy.get(`a[href$="/benutzer/detail/${user.id}"]`).filterDisplayed().parents('tr,mat-card').first()
          .within(() => {
            cy.contains('Aktiv').should('be.visible');
            cy.contains('Passwortänderung erforderlich').should('be.visible');
          });
      });
    });
  });

  it('shows the current lockout as a chip once an account is locked out', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      // The default maxFailures is 10 (application.yml) - fail that many logins to trigger a lock.
      Cypress._.times(10, () => {
        cy.createLoginRequest(user.username, 'wrong-' + testUserPassword(0), false);
      });

      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndWaitForResult();

      cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');
      cy.get(`a[href$="/benutzer/detail/${user.id}"]`).filterDisplayed().parents('tr,mat-card').first()
        .within(() => {
          cy.contains('Gesperrt bis').should('be.visible');
        });
    });
  });

  it('search result renders as a card list on phone and search still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndWaitForResult();

      // below md: the table row is hidden and the card list is shown instead
      cy.byTestId('searchresult-row').should('exist').and('not.be.visible');

      clickSearchAndOpenExpectedResult(user.id!, {alreadySearched: true});
    });
  });

  it('search result renders as a table at tablet breakpoint and search still works', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndOpenExpectedResult(user.id!);
    });
  });

  it('paginator of the search result is labelled in german', () => {
    // The german `MatPaginatorIntl` is provided by the shell route rather than app-wide, so that
    // `@angular/material/paginator` stays out of the bundle the login page loads. This checks that
    // the override really reaches a paginator rendered inside the shell.
    cy.createDummyUser().then(() => {
      cy.byTestId('searchInputText').type('lastname-');
      search();

      cy.get('mat-paginator').first().within(() => {
        cy.contains('Elemente pro Seite:').should('be.visible');
        cy.contains(/\d+ - \d+ von \d+/).should('be.visible');
        cy.get('button[aria-label="Nächste Seite"]').should('exist');
      });
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
      .and('contain.text', 'Eine reine Zahl springt bei einem exakten Treffer direkt zum Benutzer');
  });

  it('labels the edit action through its tooltip', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      cy.byTestId('search-button').click();
      cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

      cy.byTestId('searchresult-edituser-button-' + user.id).filterDisplayed().trigger('mouseenter');
      cy.get('.mat-mdc-tooltip')
        .should('have.class', 'mat-mdc-tooltip-show')
        .and('contain.text', 'Benutzer bearbeiten');
    });
  });

  /**
   * Clicks "Suchen" and waits for that search's own answer.
   *
   * The screen loads the "Aktiv" first page on arrival and leaves it on screen while a search is in
   * flight. Waiting for the response ties everything after it to the result the spec asked for -
   * same reasoning as the customer search's own helper.
   */
  function clickSearchAndWaitForResult() {
    cy.intercept('GET', /\/api\/users(\?|$)/).as('userSearch');
    cy.byTestId('search-button').click();
    cy.wait('@userSearch');
  }

  function search() {
    cy.byTestId('search-button').click();
  }

  function clickSearchAndOpenExpectedResult(expectedUserId: number, options: { alreadySearched?: boolean } = {}) {
    const {alreadySearched = false} = options;

    if (!alreadySearched) {
      clickSearchAndWaitForResult();
    }

    cy.byTestId('searchresult-table').scrollIntoView().should('be.visible');

    // The table and card list both render a link to the same href (one per branch, only one of
    // which is displayed per viewport). The whole row/card is a stretched link to it, so the href
    // itself - rather than a dedicated "show" button, which no longer exists - identifies the
    // result unambiguously.
    cy.get(`a[href$="/benutzer/detail/${expectedUserId}"]`).filterDisplayed().should('have.length', 1);

    cy.get(`a[href$="/benutzer/detail/${expectedUserId}"]`).filterDisplayed().click();
    cy.url().should('include', '/benutzer/detail/' + expectedUserId);
  }

  // The Lighthouse `pages` sweep only ever grades the empty search form - it types nothing, so it
  // never sees a result list at all, in either responsive branch.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on the search result, as a table and as a card list', () => {
      cy.createDummyUser().then((response) => {
        cy.byTestId('searchInputText').type(response.body.lastname);
        search();
        cy.byTestId('searchresult-table').should('be.visible');

        cy.checkAccessibility(MAIN_CONTENT);

        cy.viewport(PHONE_VIEWPORT);
        cy.byTestId('searchresult-table').should('not.be.visible');

        cy.checkAccessibility(MAIN_CONTENT);
      });
    });

    // A live region that exists but is never filled looks exactly like a working one in any static
    // check, so what it actually says after a search is what has to be asserted.
    it('announces the number of results through a live region', () => {
      cy.createDummyUser().then((response) => {
        cy.byTestId('searchresult-announcement').should('exist').and('have.text', '');

        cy.byTestId('searchInputText').type(response.body.lastname);
        search();
        cy.byTestId('searchresult-table').should('be.visible');

        cy.byTestId('searchresult-announcement')
          .should('have.attr', 'role', 'status')
          .and('contain.text', 'gefunden');
      });
    });

    it('announces an empty search result', () => {
      cy.byTestId('searchInputText').type('Zzzz Kein Treffer Zzzz');
      cy.byTestId('search-button').click();

      cy.byTestId('searchresult-announcement').should('have.text', 'Keine Benutzer gefunden');
    });

    it('has no violations on the empty-state CTA', () => {
      cy.byTestId('searchInputText').type('Zzzz Kein Treffer Zzzz');
      cy.byTestId('search-button').click();
      cy.byTestId('searchresult-empty').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});
