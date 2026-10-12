import dayjs from 'dayjs';
import {MAIN_CONTENT} from '../support/accessibility';

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

  it('takes an expiry date and time as they are typed here and shows them again when editing', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const title = 'E2E Ablauf ' + randomId;
      const expiry = dayjs().add(3, 'day');

      cy.byTestId('announcement-title-input').type(title);
      cy.byTestId('announcement-message-input').type('Text');
      // digits only for the date, no colon for the time - both are written out once the field is left
      cy.byTestId('announcement-expires-date-input').type(expiry.format('DDMMYYYY')).blur();
      cy.byTestId('announcement-expires-date-input').should('have.value', expiry.format('DD.MM.YYYY'));
      cy.byTestId('announcement-expires-time-input').type('1830').blur();
      cy.byTestId('announcement-expires-time-input').should('have.value', '18:30');
      cy.checkAccessibility(MAIN_CONTENT);
      cy.byTestId('announcement-save-button').click();

      cy.byTestId('announcements-list').contains('li', title)
        .should('contain.text', `läuft ab am ${expiry.format('DD.MM.YYYY')} 18:30`);

      cy.byTestId('announcements-list').contains('li', title).find('[testid^="announcement-edit-"]').click();
      cy.byTestId('announcement-expires-date-input').should('have.value', expiry.format('DD.MM.YYYY'));
      cy.byTestId('announcement-expires-time-input').should('have.value', '18:30');
      cy.byTestId('announcement-cancel-button').click();

      cy.byTestId('announcements-list').contains('li', title).find('[testid^="announcement-delete-"]').click();
      cy.contains('li', title).should('not.exist');
    });
  });

  it('does not save an expiry that is not a date', () => {
    cy.byTestId('announcement-title-input').type('E2E ungültig');
    cy.byTestId('announcement-message-input').type('Text');
    cy.byTestId('announcement-expires-date-input').type('31.02.2026');
    cy.byTestId('announcement-save-button').click();

    cy.contains('mat-error', 'Ungültiges Datum').scrollIntoView().should('be.visible');
    cy.byTestId('announcements-list').should('not.contain.text', 'E2E ungültig');
  });

  it('requires a title and a message', () => {
    cy.byTestId('announcement-save-button').click();

    // scrolled to: the save button was scrolled into view for the click, which can leave the fields above the fold
    cy.contains('Bitte einen Titel angeben').scrollIntoView().should('be.visible');
    cy.contains('Bitte eine Nachricht angeben').scrollIntoView().should('be.visible');
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
    // an aborted earlier run may have left its entries behind
    cy.request('/api/announcements').then(response => {
      response.body.items
        .filter((item: { title: string }) => item.title.startsWith('E2E Liste'))
        .forEach((item: { id: number }) => cy.request('DELETE', `/api/announcements/${item.id}`));
    });
    Cypress._.times(12, index => {
      cy.request('POST', '/api/announcements', {title: `E2E Liste ${index}`, message: 'Text'})
        .then(response => ids.push(response.body.id));
    });

    cy.reload();
    cy.byTestId('notifications-button').click();
    cy.get('.tafel-notification-menu [testid^="notification-"]').should('have.length', 10);
    cy.byTestId('notifications-show-all').scrollIntoView().should('be.visible').click();
    cy.get('.tafel-notification-menu [testid^="notification-"]').should('have.length.greaterThan', 10);
    cy.byTestId('notifications-show-all').should('not.exist');
    cy.get('body').type('{esc}');

    // clean up
    cy.then(() => ids.forEach(id => cy.request('DELETE', `/api/announcements/${id}`)));
  });
});
