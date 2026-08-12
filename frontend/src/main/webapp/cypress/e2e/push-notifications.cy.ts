import {MAIN_CONTENT} from '../support/accessibility';

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
      // Registration is stated as an age first - the exact timestamp stays next to it.
      cy.byTestId('push-device-registered').should('contain.text', 'Registriert gerade eben');
      cy.byTestId('push-device-icon').should('be.visible');

      // Renaming is reversible, so it must not be dressed up like the remove button next to it.
      cy.byTestId('push-device-rename').should('not.have.class', 'button-danger');

      cy.byTestId('push-device-rename').click();
      // the dialog exists only after this click, so no other accessibility gate sees it -
      // see cypress/support/accessibility.ts
      cy.checkDialogAccessibility();

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

      // The toast is gone by the time the user has looked at their notification centre, so the
      // outcome also stays next to the device it was sent to.
      cy.byTestId('push-device-test-status').should('be.visible').and('have.attr', 'data-state', 'error');
      cy.byTestId('push-device-test-status').should('contain.text', 'Am Server nicht eingerichtet');

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
    cy.byTestId('push-type-preference').should('have.length', 10);

    cy.byTestId('push-master-toggle').click();
    cy.byTestId('push-master-toggle').find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');

    // Switching the master off overrules the per-type settings rather than discarding them, so they
    // stay on screen and inert - hiding them read as "my settings are gone".
    cy.byTestId('push-master-disabled-hint').should('be.visible');
    cy.byTestId('push-type-preference').should('have.length', 10);
    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('be.disabled');
    // The hint and the disabled section exist only after this click, so no other accessibility gate
    // sees them - see cypress/support/accessibility.ts
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('push-master-toggle').click();
    cy.byTestId('push-master-toggle').find('button[role="switch"]').should('have.attr', 'aria-checked', 'true');
    cy.byTestId('push-master-disabled-hint').should('not.exist');
    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('not.be.disabled');

    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('have.attr', 'aria-checked', 'true');
    cy.byTestId('push-type-preference-toggle').first().click();
    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');

    cy.reload();
    cy.byTestId('push-type-preference-toggle').first().find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');
  });

  // The permission filtering lives entirely in the backend's preferences response, so the only way
  // to see it work is with a real login of a user who lacks those permissions - a mocked component
  // test would just be asserting the fixture it was handed. e2etest2 holds CUSTOMER alone, so it
  // gets the seven types that carry no permission requirement and none of the restricted ones.
  it('offers only the notification types a user can actually receive', () => {
    cy.loginE2ETest2();
    cy.visit('/benachrichtigungen');

    cy.byTestId('push-type-preference').should('have.length', 7);
    cy.get('[testid="push-type-preference"][data-type="DISTRIBUTION_STARTED"]').should('exist');
    cy.get('[testid="push-type-preference"][data-type="ALL_TICKETS_PROCESSED"]').should('exist');
    cy.get('[testid="push-type-preference"][data-type="USER_LOCKED_OUT"]').should('not.exist');
    cy.get('[testid="push-type-preference"][data-type="REPORT_MAIL_FAILED"]').should('not.exist');
    cy.get('[testid="push-type-preference"][data-type="DISTRIBUTION_STILL_OPEN"]').should('not.exist');

    // A group with nothing left in it is dropped rather than shown as a bare heading, so the two
    // restricted groups disappear entirely for this user.
    cy.byTestId('push-type-group').should('have.length', 1);
    cy.byTestId('push-type-group-title').should('contain.text', 'Ablauf der Ausgabe');
  });

  // The types are grouped and ordered by the screen, not by the response - the backend returns them
  // in its own enum order, which mixes a reminder in among the lifecycle events.
  it('groups the notification types and lists the distribution day in order', () => {
    cy.visit('/benachrichtigungen');

    cy.byTestId('push-type-group-title').should('have.length', 3);
    cy.byTestId('push-type-group-title').eq(0).should('contain.text', 'Ablauf der Ausgabe');
    cy.byTestId('push-type-group-title').eq(1).should('contain.text', 'Erinnerungen');
    cy.byTestId('push-type-group-title').eq(2).should('contain.text', 'Technisches');

    cy.get('[testid="push-type-group"][data-group="Ablauf der Ausgabe"]')
      .find('[testid="push-type-preference"]')
      .then(items => {
        const order = [...items].map(item => item.getAttribute('data-type'));
        expect(order).to.deep.equal([
          'DISTRIBUTION_STARTED',
          'CHECKIN_STARTED',
          'ROUTE_AT_LAST_STOP',
          'FOOD_COLLECTION_COMPLETED',
          'FOOD_HANDOUT_STARTED',
          'ALL_TICKETS_PROCESSED',
          'DISTRIBUTION_CLOSED'
        ]);
      });
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
