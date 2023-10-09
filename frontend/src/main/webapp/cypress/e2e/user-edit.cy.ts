describe('User Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('edit user', () => {
    cy.visit('/#/benutzer/bearbeiten/300');

    cy.byTestId('firstnameInput').type('updated');
    cy.byTestId('permission-checkbox-0').click();
    cy.byTestId('save-button').click();

    cy.url().should('contain', '/benutzer/detail');

    cy.byTestId('permissionsText').should('not.contain.text', 'Anmeldung');
    cy.byTestId('nameText').should('contain.text', 'updated');
  });

});
