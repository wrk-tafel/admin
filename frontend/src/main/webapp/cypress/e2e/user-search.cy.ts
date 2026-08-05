import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('User Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/benutzer/suchen');
  });

  it('search by personnelNumber', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('personnelNumberText').type(user.personnelNumber);
      cy.byTestId('showuser-button').click();

      cy.url().should('include', '/benutzer/detail/' + user.id);
    });
  });

  it('search by lastname and firstname', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('firstnameText').type(user.firstname);
      cy.byTestId('lastnameText').type(user.lastname);
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search by lastname only', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('lastnameText').type(user.lastname);
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search by firstname only', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('firstnameText').type(user.firstname);
      clickSearchAndOpenFirstResult(user.id!);
    });
  });

  it('search result renders as cards and the search flow works on phone', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.byTestId('lastnameText').type(user.lastname);
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

      cy.byTestId('lastnameText').type(user.lastname);
      search();

      cy.byTestId('searchresult-table').should('be.visible');
      cy.byTestId('searchresult-row-0').should('be.visible');

      openFirstResult(user.id!);
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

});
