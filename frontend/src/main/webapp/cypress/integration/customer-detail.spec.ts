import * as moment from 'moment';
import * as path from 'path';

// TODO optimize structure

describe('Customer Detail', () => {

  beforeEach(() => {
    cy.login();
    cy.visit('/#/kunden/detail/101');
  });

  it('customerId correct', () => {
    cy.byTestId('customerIdText').should('have.text', '101');
  });

  it('name correct', () => {
    cy.byTestId('nameText').should('have.text', 'Musterfrau Eva');
  });

  it('birthDate and age correct', () => {
    cy.byTestId('birthDateAgeText').should('have.text', '01.01.1990 (32)');
  });

  it('nationality correct', () => {
    cy.byTestId('countryText').should('have.text', 'Ägypten');
  });

  it('telephoneNumber correct', () => {
    cy.byTestId('telephoneNumberText').should('have.text', '436645678953');
  });

  it('email correct', () => {
    cy.byTestId('emailText').should('have.text', 'eva.musterfrau@wrk.at');
  });

  it('addressLine1 correct', () => {
    cy.byTestId('addressLine1Text').should('have.text', 'Erdberg 2, Stiege 1, Top 20');
  });

  it('addressLine2 correct', () => {
    cy.byTestId('addressLine2Text').should('have.text', '1010 Wien');
  });

  it('employer correct', () => {
    cy.byTestId('employerText').should('have.text', 'Rotes Kreuz Wien');
  });

  it('income correct', () => {
    cy.byTestId('incomeText').should('have.text', '456 €');
  });

  it('incomeDue correct', () => {
    cy.byTestId('incomeDueText').should('have.text', '31.12.2999');
  });

  it('addPerson1 correct', () => {
    cy.byTestId('addperson-0-lastnameText').should('have.text', 'Musterfrau');
    cy.byTestId('addperson-0-firstnameText').should('have.text', 'Child 1');
    cy.byTestId('addperson-0-birthDateAgeText').should('have.text', '01.01.2000 (22)');
    cy.byTestId('addperson-0-incomeText').should('have.text', 'Einkommen: 500 €');
  });

  it('addPerson2 correct', () => {
    cy.byTestId('addperson-1-lastnameText').should('have.text', 'Musterfrau');
    cy.byTestId('addperson-1-firstnameText').should('have.text', 'Child 2');
    cy.byTestId('addperson-1-birthDateAgeText').should('have.text', '01.01.2020 (2)');
    cy.byTestId('addperson-1-incomeText').should('have.text', 'Einkommen: 0 €');
  });

  it('addPerson3 correct', () => {
    cy.byTestId('addperson-2-lastnameText').should('have.text', 'Musterfrau');
    cy.byTestId('addperson-2-firstnameText').should('have.text', 'Child 3');
    cy.byTestId('addperson-2-birthDateAgeText').should('have.text', '01.01.2020 (2)');
    cy.byTestId('addperson-2-incomeText').should('have.text', 'Einkommen: -');
  });

  it('defaults for optional fields are correct', () => {
    cy.visit('/#/kunden/detail/100');
    cy.byTestId('telephoneNumberText').should('have.text', '-');
    cy.byTestId('emailText').should('have.text', '-');
    cy.byTestId('addressLine1Text').should('have.text', 'Erdberg 1, Top 10');
  });

  it('generate masterdata pdf and opens for download', () => {
    cy.byTestId('printMasterdataButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder')
    const downloadedFilename = path.join(downloadsFolder, 'stammdaten-101-musterfrau-eva.pdf')

    cy.readFile(downloadedFilename, 'binary', { timeout: 15000 })
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(20000));
  });

});
