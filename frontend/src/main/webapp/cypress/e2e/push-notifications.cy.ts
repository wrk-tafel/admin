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

  // The devices list itself only depends on the backend's /api/push/subscriptions endpoints, not
  // on a real browser subscription (see the note above on why that can't be driven under
  // Cypress) - so it's exercised here by seeding a subscription row directly via the API for the
  // logged-in e2e user, then driving the rename/delete UI against it for real.
  it('shows a seeded device, allows renaming it, and removing it', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const endpoint = `https://push.example.com/e2e-${randomNumber}`;

      cy.request({
        method: 'POST',
        url: '/api/push/subscriptions',
        body: {
          endpoint,
          p256dhKey: `p256dh-${randomNumber}`,
          authKey: `auth-${randomNumber}`,
          userAgent: 'Mozilla/5.0 Chrome/128',
        },
      }).its('status').should('eq', 201);

      cy.visit('/benachrichtigungen');

      cy.byTestId('push-device').should('have.length', 1);
      cy.byTestId('push-device-label').should('contain.text', 'Chrome');

      cy.byTestId('push-device-rename').click();
      cy.byTestId('rename-device-label-input').type('E2E Testgerät');
      cy.byTestId('okButton').click();

      cy.byTestId('push-device-label').should('contain.text', 'E2E Testgerät');

      cy.byTestId('push-device-remove').click();
      cy.byTestId('push-device').should('not.exist');
    });
  });

  // Unlike the per-device toggle/device list above, preferences are plain backend state - not
  // gated behind a real browser PushSubscription - so this flow (unlike the "not supported" test)
  // is fully driveable through the actual UI, no seeding required.
  it('allows toggling the master switch and an individual notification type', () => {
    cy.visit('/benachrichtigungen');

    cy.byTestId('push-master-toggle').find('button[role="switch"]').should('have.attr', 'aria-checked', 'true');
    cy.byTestId('push-type-preference').should('have.length', 2);

    cy.byTestId('push-master-toggle').click();
    cy.byTestId('push-master-toggle').find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');
    cy.byTestId('push-type-preference').should('not.exist');

    cy.byTestId('push-master-toggle').click();
    cy.byTestId('push-master-toggle').find('button[role="switch"]').should('have.attr', 'aria-checked', 'true');

    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('have.attr', 'aria-checked', 'true');
    cy.byTestId('push-type-preference-toggle').first().click();
    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');

    cy.reload();
    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');
  });

});
