describe('PushNotifications', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/');
  });

  // The service worker (and with it SwPush) is deliberately disabled while running under Cypress
  // (see the `enabled` flag in app.config.ts's provideServiceWorker call - an active service worker
  // would serve navigations from its own cache, bypassing Cypress's network layer). That means the
  // "supported" branch of the toggle - the actual subscribe/unsubscribe flow via a real
  // PushSubscription - can't be driven end-to-end here; it's covered by
  // push-notification.service.spec.ts and push-notification-settings.component.spec.ts instead
  // (mocked SwPush). What this test verifies is the part that *does* run for real: navigating to
  // the page via the user menu, the route being reachable by any logged-in user (ungated, like
  // password change), and the component correctly falling back to the "not supported" hint.
  it('is reachable from the user menu and shows the unsupported hint', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-pushnotifications').click();

    cy.url().should('contain', '/benachrichtigungen');
    cy.contains('Push-Benachrichtigungen').should('be.visible');
    cy.byTestId('push-notifications-unsupported').should('be.visible');
    cy.byTestId('push-notifications-toggle').should('not.exist');
  });

});
