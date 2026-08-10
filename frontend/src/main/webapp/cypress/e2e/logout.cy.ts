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
    // The request is held open until this test lets it go, rather than delayed by a fixed amount:
    // what has to happen while it is in flight is a Cypress assertion, and a click costs more time
    // than it looks (actionability checks, the menu overlay). A delay long enough today is a race
    // lost on a slower machine - the response lands first, the redirect follows, and the assertion
    // then times out on the login page looking exactly like the regression this test guards.
    let releaseLogout: (() => void) | undefined;
    const logoutHeld = new Cypress.Promise<void>(resolve => {
      releaseLogout = resolve;
    });
    cy.intercept('POST', '/api/users/logout', () => logoutHeld).as('logoutRequest');

    // The panel has to be on screen *before* logging out, or "still rendered afterwards" asserts
    // nothing: the dashboard fills itself from an SSE stream, so it arrives a moment after the
    // shell around it.
    cy.byTestId('distribution-state-text').should('be.visible');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    // `exist`, not `be.visible`: what would go wrong here is `tafelIfPermission` dropping the panel
    // out of the DOM once the cached user info is cleared, so being in the document is exactly the
    // property under test. Visibility would additionally depend on where the scrollable content
    // area happens to be scrolled to - going through the user menu moves it - which says nothing
    // about whether the panel survived.
    cy.byTestId('distribution-state-text').should('exist');
    cy.url().should('not.include', '/login');

    cy.then(() => releaseLogout?.());
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
