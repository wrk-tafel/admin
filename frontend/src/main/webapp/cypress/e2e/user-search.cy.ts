import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('User Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/benutzer/suchen');
  });

  it('shows the first results without searching', () => {
    // The testdata always contains active users, so an unfiltered first page has something in it.
    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row-0').should('exist');
  });

  it('search by personnelNumber', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('personnelNumberText').type(user.personnelNumber);
      cy.byTestId('showuser-button').click();

      cy.url().should('include', '/benutzer/detail/' + user.id);
    });
  });

  it('search by name', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search by username', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.username);
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search by personnel number through the search field', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.personnelNumber);
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search finds the user despite a typo in the name', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      // "lastnamr-<random>" instead of "lastname-<random>" - close enough for the fuzzy match
      cy.byTestId('searchInputText').type(user.lastname.replace('lastname-', 'lastnamr-'));
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search result renders as cards and the search flow works on phone', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      search();

      // desktop table branch stays in the DOM but is hidden below the md: breakpoint
      cy.byTestId('searchresult-table').should('not.be.visible');

      openFirstResult(user.id!);
    });
  });

  it('search result renders as a table and the search flow works on tablet', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('searchInputText').type(user.lastname);
      search();

      cy.byTestId('searchresult-table').should('be.visible');
      cy.byTestId('searchresult-row-0').should('be.visible');

      openFirstResult(user.id!);
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

  function search() {
    cy.byTestId('search-button').click();
  }

  // The show-user button testid is rendered once per responsive branch (table row + card),
  // both always in the DOM - filter to the currently displayed one so this works at any viewport.
  function openFirstResult(expectedUserId: number) {
    cy.byTestId('searchresult-showuser-button-0').filterDisplayed().should('have.length', 1);
    cy.byTestId('searchresult-showuser-button-0').filterDisplayed().click();
    cy.url().should('include', '/benutzer/detail/' + expectedUserId);
  }

  function clickSearchAndOpenFirstResult(expectedUserId: number) {
    search();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row-0').should('be.visible');

    openFirstResult(expectedUserId);
  }

  // The Lighthouse `pages` sweep only ever grades the empty search form - it types nothing, so it
  // never sees a result list at all, in either responsive branch.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on the search result, as a table and as a card list', () => {
      cy.createDummyUser().then(response => {
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
      cy.createDummyUser().then(response => {
        cy.byTestId('searchresult-announcement').should('exist').and('have.text', '');

        cy.byTestId('searchInputText').type(response.body.lastname);
        search();
        cy.byTestId('searchresult-table').should('be.visible');

        cy.byTestId('searchresult-announcement')
          .should('have.attr', 'role', 'status')
          .and('contain.text', 'gefunden');
      });
    });

  });

});
