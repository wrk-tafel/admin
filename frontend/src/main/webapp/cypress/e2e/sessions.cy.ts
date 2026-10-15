import {MAIN_CONTENT} from '../support/accessibility';

// "Mein Konto" > "Sitzungen": the own logins, and ending them. Each `cy.loginDefault()` opens a session of its own
// for `e2etest` - the ones opened before the last stand for other devices; the last one is this browser's.
const SESSION_COOKIE = 'tafel-admin-session';

/** The key the API knows the session behind the browser's current cookie by. */
function currentSessionKey(): Cypress.Chainable<string> {
  return cy.request('/api/users/sessions').then(response => {
    const current = (response.body.items as { id: string; current: boolean }[]).find(item => item.current);
    return current!.id;
  });
}

/** Whether a session cookie, sent on its own, still opens the application - without losing the browser's own. */
function expectSessionEnded(sessionCookie: string) {
  cy.getCookie(SESSION_COOKIE).then(own => {
    cy.setCookie(SESSION_COOKIE, sessionCookie, {httpOnly: true});
    cy.request({url: '/api/users/info', failOnStatusCode: false}).its('status').should('eq', 401);
    cy.setCookie(SESSION_COOKIE, own!.value, {httpOnly: true});
  });
}

describe('Sessions', () => {

  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('lists the own sessions with this one marked, reachable from the account menu', () => {
    cy.loginDefault();
    cy.loginDefault();
    cy.visit('/konto/daten');

    cy.byTestId('account-nav-sessions').click();

    cy.url().should('contain', '/konto/sitzungen');
    cy.byTestId('account-nav-sessions').should('have.attr', 'aria-current', 'page');
    cy.byTestId('user-session').should('have.length.at.least', 2);
    cy.byTestId('user-session-current-badge').should('have.length', 1).and('contain.text', 'diese Sitzung');
    cy.get('[testid="user-session"][data-current="true"]').within(() => {
      cy.byTestId('user-session-end').should('not.exist');
      cy.byTestId('user-session-times').should('contain.text', 'Angemeldet am');
    });
    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('ends another session, which is logged out at once', () => {
    cy.loginDefault();
    cy.getCookie(SESSION_COOKIE).then(otherDevice => {
      currentSessionKey().then(otherKey => {
        cy.loginDefault();
        cy.visit('/konto/sitzungen');

        cy.get(`[testid="user-session"][data-session-id="${otherKey}"]`).within(() => {
          cy.byTestId('user-session-end').click();
        });

        cy.contains('Sitzung wurde beendet.').should('be.visible');
        cy.get(`[testid="user-session"][data-session-id="${otherKey}"]`).should('not.exist');
        cy.byTestId('user-session-current-badge').should('be.visible');
        expectSessionEnded(otherDevice!.value);
      });
    });
  });

  it('ends all other sessions and keeps this one', () => {
    cy.loginDefault();
    cy.getCookie(SESSION_COOKIE).then(otherDevice => {
      cy.loginDefault();
      cy.visit('/konto/sitzungen');

      cy.byTestId('user-sessions-end-others').click();

      cy.contains('Alle anderen Sitzungen wurden beendet.').should('be.visible');
      cy.byTestId('user-session').should('have.length', 1);
      cy.byTestId('user-sessions-no-others').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
      expectSessionEnded(otherDevice!.value);

      // and this browser is still logged in
      cy.reload();
      cy.url().should('contain', '/konto/sitzungen');
      cy.byTestId('user-session-current-badge').should('be.visible');
    });
  });

  it('logging out ends only this session', () => {
    cy.loginDefault();
    cy.getCookie(SESSION_COOKIE).then(otherDevice => {
      cy.loginDefault();
      cy.visit('/uebersicht');

      cy.byTestId('usermenu').click();
      cy.byTestId('usermenu-logout').click();
      cy.url().should('include', '/login');

      cy.setCookie(SESSION_COOKIE, otherDevice!.value, {httpOnly: true});
      cy.request('/api/users/info').its('status').should('eq', 200);
    });
  });
});
