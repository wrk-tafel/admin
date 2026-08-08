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

  // The test button's send path is driveable for real against a seeded device - what can't be
  // asserted here is a *delivered* notification (no real PushSubscription under Cypress, see
  // above). The e2e profile configures no VAPID keypair, so the send stops before any network
  // call and the endpoint reports NOT_CONFIGURED - which is precisely the case the button has to
  // surface as a distinct, actionable message rather than a generic failure.
  it('sends a test notification to a device and reports that push is not configured', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      cy.request({
        method: 'POST',
        url: '/api/push/subscriptions',
        body: {
          endpoint: `https://push.example.com/e2e-test-${randomNumber}`,
          p256dhKey: `p256dh-${randomNumber}`,
          authKey: `auth-${randomNumber}`,
          userAgent: 'Mozilla/5.0 Chrome/128',
        },
      }).its('status').should('eq', 201);

      cy.visit('/benachrichtigungen');

      // Sending a test notification is harmless, so it must not be dressed up as a destructive
      // action the way the neighbouring remove button is - it stays the plain theme-blue button.
      cy.byTestId('push-device-test').should('not.have.class', 'button-danger');
      cy.byTestId('push-device-remove').should('have.class', 'button-danger');

      cy.byTestId('push-device-test').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'nicht konfiguriert');

      // A device that merely couldn't be reached must stay in the list - only an expired one gets
      // pruned.
      cy.byTestId('push-device').should('have.length', 1);
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
    // e2etest holds ADMINISTRATOR, which grants every other permission, so every type is listed
    // here - the filtered case is the separate test below.
    cy.byTestId('push-type-preference').should('have.length', 9);

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

  // The permission filtering lives entirely in the backend's preferences response, so the only way
  // to see it work is with a real login of a user who lacks those permissions - a mocked component
  // test would just be asserting the fixture it was handed. e2etest2 holds CUSTOMER alone, so it
  // gets the two types that carry no permission requirement and none of the restricted ones.
  it('offers only the notification types a user can actually receive', () => {
    cy.loginE2ETest2();
    cy.visit('/benachrichtigungen');

    cy.byTestId('push-type-preference').should('have.length', 6);
    cy.get('[testid="push-type-preference"][data-type="DISTRIBUTION_STARTED"]').should('exist');
    cy.get('[testid="push-type-preference"][data-type="ALL_TICKETS_PROCESSED"]').should('exist');
    cy.get('[testid="push-type-preference"][data-type="USER_LOCKED_OUT"]').should('not.exist');
    cy.get('[testid="push-type-preference"][data-type="REPORT_MAIL_FAILED"]').should('not.exist');
    cy.get('[testid="push-type-preference"][data-type="DISTRIBUTION_STILL_OPEN"]').should('not.exist');
  });

  // Each toggle carries its own explanation, so the list says when a notification would actually
  // arrive rather than leaving that to the label alone.
  it('explains each notification type below its toggle', () => {
    cy.visit('/benachrichtigungen');

    cy.get('[testid="push-type-preference"][data-type="DISTRIBUTION_STILL_OPEN"]')
      .find('[testid="push-type-preference-description"]')
      .should('contain.text', 'noch nicht beendet');
  });

});
