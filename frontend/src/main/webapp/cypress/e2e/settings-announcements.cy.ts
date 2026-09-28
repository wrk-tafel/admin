describe('Settings - Announcements and the notification bell', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/ankuendigungen');
  });

  it('publishes an announcement that shows up in the bell, can be read and is deleted again', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const title = 'E2E Ankündigung ' + randomId;

      // the badge is absent while nothing is unread
      cy.get('body').then($body => Number($body.find('[testid="notifications-badge"]').text().trim()) || 0).as('unreadBefore');

      cy.byTestId('announcement-title-input').type(title);
      cy.byTestId('announcement-message-input').type('Am Freitag bleibt die Ausgabe geschlossen.');
      cy.byTestId('announcement-save-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'veröffentlicht');
      // a successful save leaves an empty form without validation errors
      cy.byTestId('announcement-title-input').should('have.value', '');
      cy.contains('Bitte einen Titel angeben').should('not.exist');
      cy.byTestId('announcements-list').should('contain.text', title);

      // the bell learns of it over the open stream, without being opened or the page reloaded
      cy.get('@unreadBefore').then(before => {
        cy.byTestId('notifications-badge').should($badge => {
          expect(Number($badge.text().trim())).to.be.greaterThan(Number(before));
        });
      });

      // the bell picks it up when it is opened
      cy.byTestId('notifications-button').click();
      cy.get('[testid^="notification-ANNOUNCEMENT-"]').contains(title).should('be.visible');
      cy.checkMenuAccessibility();
      cy.get('[testid^="notification-ANNOUNCEMENT-"]').contains(title).click();

      // read: the entry is no longer marked, and the badge counts one less
      cy.byTestId('notifications-button').click();
      cy.get('[testid^="notification-ANNOUNCEMENT-"]').contains(title).closest('button').should('not.have.class', 'font-semibold');
      cy.get('body').type('{esc}');

      // clean up through the screen itself
      cy.byTestId('announcements-list').contains('li', title).find('[testid^="announcement-delete-"]').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
      cy.contains('li', title).should('not.exist');
    });
  });

  it('edits an announcement', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const title = 'E2E Bearbeiten ' + randomId;

      cy.byTestId('announcement-title-input').type(title);
      cy.byTestId('announcement-message-input').type('Text');
      cy.byTestId('announcement-save-button').click();
      cy.byTestId('announcements-list').should('contain.text', title);

      cy.byTestId('announcements-list').contains('li', title).find('[testid^="announcement-edit-"]').click();
      cy.byTestId('announcement-form-heading').should('contain.text', 'bearbeiten');
      cy.byTestId('announcement-message-input').clear().type('Geänderter Text');
      cy.byTestId('announcement-save-button').click();

      cy.byTestId('announcements-list').contains('li', title).should('contain.text', 'Geänderter Text');

      cy.byTestId('announcements-list').contains('li', title).find('[testid^="announcement-delete-"]').click();
      cy.contains('li', title).should('not.exist');
    });
  });

  it('requires a title and a message', () => {
    cy.byTestId('announcement-save-button').click();

    cy.contains('Bitte einen Titel angeben').should('be.visible');
    cy.contains('Bitte eine Nachricht angeben').should('be.visible');
  });

  it('marks everything read from the bell', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const title = 'E2E Alles gelesen ' + randomId;

      cy.byTestId('announcement-title-input').type(title);
      cy.byTestId('announcement-message-input').type('Text');
      cy.byTestId('announcement-save-button').click();
      cy.byTestId('announcements-list').should('contain.text', title);

      cy.byTestId('notifications-button').click();
      cy.byTestId('notifications-mark-all-read').click();
      cy.byTestId('notifications-mark-all-read').should('not.exist');
      cy.get('body').type('{esc}');
      cy.byTestId('notifications-badge').should('not.exist');

      cy.byTestId('announcements-list').contains('li', title).find('[testid^="announcement-delete-"]').click();
      cy.contains('li', title).should('not.exist');
    });
  });

  it('lists ten entries in the bell and shows the rest on request', () => {
    const ids: number[] = [];
    Cypress._.times(12, index => {
      cy.request('POST', '/api/announcements', {title: `E2E Liste ${index}`, message: 'Text'})
        .then(response => ids.push(response.body.id));
    });

    cy.reload();
    cy.byTestId('notifications-button').click();
    cy.get('.tafel-notification-menu [testid^="notification-"]').should('have.length', 10);
    cy.byTestId('notifications-show-all').should('be.visible').click();
    cy.get('.tafel-notification-menu [testid^="notification-"]').should('have.length.greaterThan', 10);
    cy.byTestId('notifications-show-all').should('not.exist');
    cy.get('body').type('{esc}');

    // clean up
    cy.then(() => ids.forEach(id => cy.request('DELETE', `/api/announcements/${id}`)));
  });
});
