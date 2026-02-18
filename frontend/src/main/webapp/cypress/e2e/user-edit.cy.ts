describe('User Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('edit user', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.visit('/#/benutzer/detail/' + user.id);
      cy.byTestId('permissionsText').should('not.contain.text', 'Anmeldung');

      cy.visit('/#/benutzer/bearbeiten/' + user.id);

      // Wait for form to be fully loaded with user data
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('firstnameInput').click();
      cy.byTestId('firstnameInput').clear();
      cy.byTestId('firstnameInput').type(`${user.firstname} updated`);

      cy.byTestId('permission-checkbox-0').click();

      cy.intercept('POST', '/api/users/' + user.id).as('updateUser');
      cy.byTestId('save-button').click();
      cy.wait('@updateUser');

      cy.url().should('contain', '/benutzer/detail/' + user.id);

      cy.byTestId('permissionsText').should('contain.text', 'Anmeldung');
      cy.byTestId('nameText').should('contain.text', 'updated');
    });
  });

});
