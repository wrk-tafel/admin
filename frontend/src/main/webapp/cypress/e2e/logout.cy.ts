describe('Logout', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#');
  });

  it('logout working as expected', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('include', '/login');
  });

});
