import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

// Comfortably past the backoff `SseService` is on by the time the login lands (1s, then 2s, 4s),
// so a stream that is coming back has come back before the count is taken.
const RECONNECT_SETTLE_MILLIS = 8000;

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

  it('keeps the current page fully rendered until the redirect happens', () => {
    // The cached user info backs every permission check on screen, so it must not be dropped
    // while the logout request is still running - the page the user is looking at would visibly
    // lose its permission-gated panels and menu entries first, and only then navigate away.
    cy.intercept('POST', '/api/users/logout', req => {
      req.on('response', res => {
        res.setDelay(1000);
      });
    }).as('logoutRequest');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.byTestId('distribution-state-text').should('be.visible');
    cy.url().should('not.include', '/login');

    cy.wait('@logoutRequest');
    cy.url().should('include', '/login');
  });

  /**
   * A browser gives an origin only six concurrent HTTP/1.1 connections and an open SSE stream holds
   * one of them for as long as it lives. The resolver that starts the `/sse/distributions` stream
   * runs again on every login, so a logout/login round trip in the same tab used to leave the
   * previous stream open and add a second one - a few round trips and the tab had no connections
   * left for anything else, so API calls, images and even a reload just queued up until the reverse
   * proxy gave up with a 504. Only closing the tab recovered it.
   *
   * This has to be an e2e case: the leak is one of real browser sockets surviving a real navigation
   * between the login page and the authenticated layout, which a unit spec with a mocked
   * `SseService` cannot observe at all.
   */
  it('keeps a single distributions stream open across a logout/login round trip in the same tab', () => {
    const streams: EventSource[] = [];

    // `/uebersicht` rather than the `/#` the other cases use: `beforeEach` has already visited that
    // one, and re-visiting an identical URL only moves the hash instead of reloading, so
    // `onBeforeLoad` would never run and the counter below would never be installed.
    cy.visit('/uebersicht', {
      onBeforeLoad(win) {
        const nativeEventSource = win.EventSource;
        win.EventSource = class extends nativeEventSource {
          constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
            super(url, eventSourceInitDict);
            streams.push(this);
          }
        };
      }
    });

    const openDistributionStreams = () => streams.filter(
      stream => new URL(stream.url).pathname.endsWith('/api/sse/distributions')
        && stream.readyState !== EventSource.CLOSED
    );

    cy.byTestId('distribution-state-text').should('be.visible');
    cy.then(() => expect(openDistributionStreams()).to.have.length(1));

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();
    cy.url().should('include', '/login');

    cy.byTestId('username').type('e2etest');
    cy.byTestId('password').type('e2etest');
    cy.byTestId('loginButton').click();
    cy.byTestId('distribution-state-text').should('be.visible');

    // The stream the logout killed reconnects on a backoff, so the count is only meaningful once
    // everything that is going to come back has come back - asserting the moment the dashboard
    // renders would read "1" even with a second stream still mid-reconnect.
    cy.wait(RECONNECT_SETTLE_MILLIS);
    cy.then(() => expect(openDistributionStreams()).to.have.length(1));
  });

  it('remains usable on a phone viewport', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/#');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('include', '/login');
  });

  it('remains usable on a tablet viewport', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/#');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('include', '/login');
  });

});
