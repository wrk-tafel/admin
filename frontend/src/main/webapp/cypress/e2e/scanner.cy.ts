import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.clearLocalStorage('scanner-id');
  });

  it('connection and webcam initialized successfully', () => {
    cy.visit('/#/anmeldung/scanner');

    // Check that the scanner ID is displayed
    cy.byTestId('scanner-id').should('be.visible').invoke('text').then((text) => {
      expect(text).to.not.equal('');
      expect(Number(text)).to.be.greaterThan(0);
    });

    // Check that the scanner is ready. Camera init involves real device/codec
    // negotiation, which can be slower than typical DOM assertions.
    cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');
  });

  it('QR code scanned from webcam is decoded and sent to the backend', () => {
    cy.intercept('POST', '/api/scanners/*/results*').as('scanResult');

    cy.visit('/#/anmeldung/scanner');
    cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');

    // The fake webcam feed (cypress.config.ts) shows a QR code encoding '12345' -
    // decoding it end-to-end confirms the actual scan pipeline, not just camera readiness.
    // Frame-by-frame QR decoding is slower and less deterministic than typical
    // DOM assertions, so this gets a generous timeout too.
    cy.byTestId('message', {timeout: 20000}).should('contain.text', 'Letzter Scan: 12345');

    cy.wait('@scanResult', {timeout: 20000}).its('request.url').should('include', 'scanResult=12345');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/#/anmeldung/scanner');

      cy.byTestId('scanner-id').should('be.visible');
      cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');
    });
  });

});
