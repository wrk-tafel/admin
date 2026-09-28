import dayjs from 'dayjs';
import {PHONE_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Customer Locked', () => {

  beforeEach(() => {
    cy.loginDefault();

    // The list is oldest-review-first, so a lock set moments ago sorts last - ask for a page large
    // enough that leftovers of other specs cannot push it onto a second page.
    cy.intercept({method: 'GET', pathname: '/api/households/locked'}, (req) => {
      const url = new URL(req.url);
      url.searchParams.set('pageSize', '100');
      req.url = url.toString();
    }).as('getLocked');
  });

  function lockCustomer(customerId: number, reason: string) {
    cy.visit('/kunden/detail/' + customerId);
    cy.byTestId('editCustomerToggleButton').click();
    cy.byTestId('lockCustomerButton').click();
    cy.byTestId('lockreason-input-text').type(reason);
    cy.byTestId('lock-customer-dialog').within(() => {
      cy.byTestId('okButton').click();
    });
    cy.byTestId('lock-info-banner').should('exist');
  }

  function unlockCustomer(customerId: number) {
    cy.visit('/kunden/detail/' + customerId);
    cy.byTestId('editCustomerToggleButton').click();
    cy.byTestId('unlockCustomerButton').click();
    cy.byTestId('lock-info-banner').should('not.exist');
  }

  it('lists a lock without an end date, confirms its review and drops it from the list once unlocked', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;
      lockCustomer(customer.id!, 'kept e2e lock reason');

      cy.visit('/kunden/gesperrt');
      cy.wait('@getLocked');

      cy.contains('[testid^="locked-id-"]', customer.id!.toString())
        .closest('tr')
        .scrollIntoView()
        .within(() => {
          cy.get('[testid^="locked-name-"]').should('contain.text', customer.lastname);
          cy.get('[testid^="locked-reason-"]').should('contain.text', 'kept e2e lock reason');
          cy.get('[testid^="locked-lockedUntil-"]').should('contain.text', 'Kein Enddatum');
          cy.get('[testid^="locked-review-"]').should('contain.text', 'Noch nicht überprüft');
          // a lock set a moment ago is not due yet
          cy.get('[testid^="locked-due-"]').should('not.exist');

          cy.get('[testid^="locked-confirm-button-"]').click();
        });

      cy.wait('@getLocked');
      cy.contains('[testid^="locked-id-"]', customer.id!.toString())
        .closest('tr')
        .within(() => {
          cy.get('[testid^="locked-review-"]')
            .should('contain.text', 'Zuletzt überprüft am ' + dayjs().format('DD.MM.YYYY'))
            .and('not.contain.text', 'Noch nicht überprüft');
        });

      unlockCustomer(customer.id!);

      cy.visit('/kunden/gesperrt');
      cy.wait('@getLocked');
      cy.contains('[testid^="locked-id-"]', customer.id!.toString()).should('not.exist');
    });
  });

  it('a lock with an end date lifts itself and offers no confirmation', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;
      cy.visit('/kunden/detail/' + customer.id);
      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('lockCustomerButton').click();
      cy.byTestId('lockreason-input-text').type('temporary e2e lock reason');
      cy.byTestId('lockeduntil-input').type(dayjs().add(14, 'day').format('YYYY-MM-DD'));
      cy.byTestId('lock-customer-dialog').within(() => {
        cy.byTestId('okButton').click();
      });
      cy.byTestId('lock-info-banner').should('exist');

      cy.visit('/kunden/gesperrt');
      cy.wait('@getLocked');

      cy.contains('[testid^="locked-id-"]', customer.id!.toString())
        .closest('tr')
        .scrollIntoView()
        .within(() => {
          cy.get('[testid^="locked-lockedUntil-"]').should('contain.text', dayjs().add(14, 'day').format('DD.MM.YYYY'));
          cy.get('[testid^="locked-review-"]').should('contain.text', 'Hebt sich selbst auf');
          cy.get('[testid^="locked-confirm-button-"]').should('not.exist');
        });

      // the "Ohne Enddatum" filter leaves it out
      cy.byTestId('locked-filter-openEnded').click();
      cy.wait('@getLocked').its('request.url').should('include', 'openEndedOnly=true');
      cy.contains('[testid^="locked-id-"]', customer.id!.toString()).should('not.exist');

      unlockCustomer(customer.id!);
    });
  });

  it('marks a lock that is due for review and filters for it', () => {
    // A lock only becomes due after months, which an end-to-end run cannot wait for - the marker is
    // driven from a stubbed response, and the request the filter sends is checked for real.
    cy.intercept({method: 'GET', pathname: '/api/households/locked'}, {
      items: [{
        householdId: 4711,
        name: 'Beispiel Berta',
        lockedAt: '2025-01-10T09:00:00',
        lockedBy: '00100 Max Muster',
        lockReasonType: 'BANNED_FROM_PREMISES',
        lockReason: 'Bedrohung von Mitarbeitern',
        lockedUntil: null,
        lockReviewedAt: null,
        lockReviewedBy: null,
        reviewDue: true
      }],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      pageSize: 10
    }).as('getLockedStub');

    cy.visit('/kunden/gesperrt');
    cy.wait('@getLockedStub');

    cy.byTestId('locked-row').should('have.length', 1);
    cy.byTestId('locked-due-0').should('contain.text', 'Überprüfung fällig');
    cy.byTestId('locked-reason-0').should('contain.text', 'Hausverbot').and('contain.text', 'Bedrohung von Mitarbeitern');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('locked-filter-due').click();
    cy.wait('@getLockedStub').its('request.url').should('include', 'dueOnly=true');
  });

  it('says so when no lock is due for review', () => {
    cy.visit('/kunden/gesperrt');
    cy.wait('@getLocked');

    cy.byTestId('locked-filter-due').click();
    cy.wait('@getLocked').its('request.url').should('include', 'dueOnly=true');

    cy.byTestId('locked-empty').should('contain.text', 'mit fälliger Überprüfung');
  });

  it('is reachable from the sidebar', () => {
    cy.visit('/uebersicht');

    // lives under the collapsible "Auswertungen" nav group - expand it first
    cy.contains('button', 'Auswertungen').click();
    cy.get('a[href="/kunden/gesperrt"]').click();

    cy.url().should('include', '/kunden/gesperrt');
    cy.title().should('contain', 'Gesperrte Kunden');
  });

  describe('on a phone', () => {
    it('renders the locks as cards, with the confirmation and no violations', () => {
      cy.viewport(PHONE_VIEWPORT);

      cy.createDummyCustomer().then((response) => {
        const customer = response.body.data;
        lockCustomer(customer.id!, 'phone e2e lock reason');

        cy.visit('/kunden/gesperrt');
        cy.wait('@getLocked');

        cy.contains('[testid="locked-card"]', customer.lastname).scrollIntoView().within(() => {
          cy.contains('phone e2e lock reason').should('be.visible');
          cy.contains('Kein Enddatum').should('be.visible');
        });
        cy.checkAccessibility(MAIN_CONTENT);

        cy.contains('[testid="locked-card"]', customer.lastname).within(() => {
          cy.get('[testid^="locked-confirm-button-"]').click();
        });
        cy.wait('@getLocked');
        cy.contains('[testid="locked-card"]', customer.lastname).contains('Zuletzt überprüft am').should('be.visible');

        unlockCustomer(customer.id!);
      });
    });
  });

});
