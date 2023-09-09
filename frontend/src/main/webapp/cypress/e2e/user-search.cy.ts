describe('User Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/benutzer/suchen');
  });

  it('buttons disabled by default', () => {
    cy.byTestId('showuser-button').should('be.disabled');
    cy.byTestId('search-button').should('be.disabled');
  });

  it('search by personnelNumber', () => {
    cy.byTestId('personnelNumberText').type('100');
    cy.byTestId('showuser-button').click();

    cy.url().should('include', '/kunden/detail/100');
  });

  it('search by lastname and firstname', () => {
    cy.byTestId('lastnameText').type('e2e-search');
    cy.byTestId('firstnameText').type('1');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 2);

    cy.byTestId('searchresult-showuser-button-0').should('be.visible');

    cy.byTestId('searchresult-showuser-button-0').click();
    cy.url().should('include', '/kunden/detail/201');
  });

  it('search by lastname only', () => {
    cy.byTestId('lastnameText').type('e2e-search');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 2);

    cy.byTestId('searchresult-showuser-button-0').should('be.visible');

    cy.byTestId('searchresult-showuser-button-0').click();
    cy.url().should('include', '/benutzer/detail/201');
  });

  it('search by firstname only', () => {
    cy.byTestId('firstnameText').type('2');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 1);

    cy.byTestId('searchresult-showuser-button-0').should('be.visible');

    cy.byTestId('searchresult-showuser-button-0').click();
    cy.url().should('include', '/benutzer/detail/202');
  });

});
