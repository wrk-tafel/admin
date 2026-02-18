describe('User Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('userId correct', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;
      cy.visit('/#/benutzer/detail/' + user.id);
      cy.byTestId('usernameText').should('have.text', user.username);
    });
  });

  it('disable and re-enable user', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.visit('/#/benutzer/detail/' + user.id);
      cy.byTestId('enabledText').should('have.text', 'Ja');

      cy.intercept('POST', '/api/users/' + user.id).as('disableUser');
      cy.byTestId('changeUserStateButton').click();
      cy.byTestId('disableUserButton').click();
      cy.wait('@disableUser');

      cy.byTestId('enabledText').should('have.text', 'Nein');

      cy.intercept('POST', '/api/users/' + user.id).as('enableUser');
      cy.byTestId('changeUserStateButton').click();
      cy.byTestId('enableUserButton').click();
      cy.wait('@enableUser');

      cy.byTestId('enabledText').should('have.text', 'Ja');
    });
  });

  it('edit user', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;
      cy.visit('/#/benutzer/detail/' + user.id);

      cy.byTestId('editUserButton').click();

      cy.url().should('include', '/benutzer/bearbeiten/' + user.id);
    });
  });

  it('delete user', () => {
    cy.createDummyUser().then(response => {
      const userId = response.body.id;

      cy.visit('/#/benutzer/detail/' + userId);

      cy.intercept('DELETE', '/api/users/*').as('deleteUser');
      cy.byTestId('changeUserStateButton').click();
      cy.byTestId('deleteUserButton').click();
      cy.wait('@deleteUser');

      cy.url().should('include', '/benutzer/suchen');

      // delete fails, UI stays on user-search and shows toast
      cy.visit('/#/benutzer/detail/' + userId);
      cy.url().should('include', '/benutzer/suchen');
    });
  });

});
