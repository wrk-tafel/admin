import dayjs from 'dayjs';
import {MAIN_CONTENT} from '../support/accessibility';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Customer QuickCheck', () => {

  beforeEach(() => {
    cy.loginE2ETest2();
    cy.visit('/kunden/schnellcheck');
  });

  it('answers a qualified household with the full breakdown dialog', () => {
    // same composition as the customer-create spec's breakdown case: 2 adults with 500 each plus
    // one 3-year-old with family allowance - fits exactly into the three default rows
    cy.byTestId('birthDateInput-0').type(birthDateForAge(30));
    cy.byTestId('incomeInput-0').type('500');

    cy.byTestId('birthDateInput-1').type(birthDateForAge(30));
    cy.byTestId('incomeInput-1').type('500');
    // the pre-created rows default to receiving family allowance - this one is an adult
    cy.byTestId('receivesFamilyAllowanceInput-1').click();

    cy.byTestId('birthDateInput-2').type(birthDateForAge(3));

    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('quickcheck-button').click();

    cy.byTestId('validationresult-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Anspruch vorhanden');
        cy.byTestId('header').should('have.class', 'dialog-header-success');

        cy.byTestId('detail-income').should('contain.text', '1.000,00');
        cy.byTestId('detail-familyallowance').should('contain.text', '148,00');
        cy.byTestId('detail-childtaxallowance').should('contain.text', '70,90');
        cy.byTestId('total-income').should('contain.text', '1.218,90');

        cy.byTestId('detail-baselimit')
          .should('contain.text', 'Grundbetrag (2 Erw., 1 Kind)')
          .and('contain.text', '3.289,00');
        cy.byTestId('detail-tolerance').should('contain.text', '100,00');
        cy.byTestId('total-limit').should('contain.text', '3.389,00');
      });
    // the dialog exists only after the check, so no other accessibility gate sees it -
    // see cypress/support/accessibility.ts
    cy.checkDialogAccessibility();
    cy.byTestId('validationresult-dialog').within(() => {
      cy.byTestId('ok-button').click();
    });
  });

  it('answers an income above the limit with "Kein Anspruch vorhanden"', () => {
    cy.byTestId('birthDateInput-0').type(birthDateForAge(30));
    cy.byTestId('incomeInput-0').type('10000');

    cy.byTestId('quickcheck-button').click();

    cy.byTestId('validationresult-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Kein Anspruch vorhanden');
        cy.byTestId('header').should('have.class', 'dialog-header-danger');
        cy.byTestId('ok-button').click();
      });
  });

  it('shows a live eligibility summary that updates without clicking Anspruch prüfen', () => {
    cy.byTestId('birthDateInput-0').type(birthDateForAge(30));
    cy.byTestId('incomeInput-0').type('500');

    // the debounced quick-check call needs a moment before the summary appears
    cy.byTestId('eligibility-summary', {timeout: 8000}).should('be.visible');
    cy.byTestId('eligibility-status').should('contain.text', 'Anspruch vorhanden');
    cy.byTestId('eligibility-personcount').should('contain.text', '1');

    cy.byTestId('incomeInput-0').clear().type('10000');
    cy.byTestId('eligibility-status', {timeout: 8000}).should('contain.text', 'Kein Anspruch vorhanden');
    cy.byTestId('eligibility-amount').should('be.visible');
  });

  it('hands the entered persons over to the customer form via "Kunden anlegen"', () => {
    const adultBirthDate = birthDateForAge(30);
    const childBirthDate = birthDateForAge(3);

    cy.byTestId('birthDateInput-0').type(adultBirthDate);
    cy.byTestId('incomeInput-0').type('1000');
    cy.byTestId('birthDateInput-1').type(childBirthDate);
    // the third default row stays empty and must not be handed over

    cy.byTestId('create-customer-link').click();
    cy.url().should('include', '/kunden/anlegen');

    cy.byTestId('birthDateInput').should('have.value', adultBirthDate);
    cy.byTestId('incomeInput').should('have.value', '1000');
    // the handed-over child arrives as a collapsed additional person with its flag intact
    cy.byTestId('personform-header-0')
      .should('be.visible')
      .and('contain.text', 'Familienbeihilfe');
  });

  it('rejects a check while no person has a birthdate yet', () => {
    cy.byTestId('quickcheck-button').click();

    cy.get('.toast-message')
      .should('be.visible')
      .should('contain.text', 'Bitte mindestens ein Geburtsdatum erfassen!');
    cy.byTestId('validationresult-dialog').should('not.exist');
  });

  it('rejects a check while a person has an income but no birthdate', () => {
    cy.byTestId('birthDateInput-0').type(birthDateForAge(30));
    cy.byTestId('incomeInput-1').type('500');

    cy.byTestId('quickcheck-button').click();

    cy.get('.toast-message')
      .should('be.visible')
      .should('contain.text', 'Bitte Eingaben überprüfen!');
    cy.byTestId('validationresult-dialog').should('not.exist');
  });

  it('reports a household composition that has no configured income limit', () => {
    // a household of one child and no adult - no income limit is configured for that composition
    cy.byTestId('birthDateInput-0').type(birthDateForAge(10));

    cy.byTestId('quickcheck-button').click();

    cy.get('.toast-message')
      .should('be.visible')
      .should('contain.text', 'Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: 0, Kinder: 1)!');
    cy.byTestId('validationresult-dialog').should('not.exist');
  });

  it('adds a fourth person and removes it again', () => {
    cy.byTestId('quickcheck-person-2').should('exist');
    cy.byTestId('addperson-button').click();
    cy.byTestId('quickcheck-person-3').should('exist');

    cy.byTestId('remove-person-3').click();
    cy.byTestId('quickcheck-person-3').should('not.exist');
  });

  it('links into the full customer creation form', () => {
    cy.byTestId('create-customer-link').click();
    cy.url().should('include', '/kunden/anlegen');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('birthDateInput-0').should('be.visible');
      cy.byTestId('quickcheck-button').should('exist');
    });
  });

  function birthDateForAge(age: number): string {
    return dayjs().subtract(age, 'years').subtract(1, 'day').format('YYYY-MM-DD');
  }
});
