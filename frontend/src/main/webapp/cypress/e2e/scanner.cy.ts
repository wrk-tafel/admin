import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.clearLocalStorage('tafel.scanner.id');
  });

  // The pairing phase is over the moment the camera's first decode resolves, and the fake webcam
  // (cypress.config.ts) gets there in milliseconds - so any assertion about the pairing layout
  // races a switch that is one-way (ScannerComponent's `hasStartedScanning`), and loses as soon
  // as the runner is fast enough. Leaving `getUserMedia` pending pins the component in exactly
  // the state the runner reads the number out in: registered, cameras enumerated and one picked,
  // nothing decoded yet. @zxing/browser enumerates cameras through `enumerateDevices()` alone, so
  // the camera picker still renders and stays part of what these tests cover.
  function visitScannerWithPendingCamera() {
    cy.visit('/anmeldung/scanner', {
      onBeforeLoad(win) {
        cy.stub(win.navigator.mediaDevices, 'getUserMedia')
          .returns(new Promise<MediaStream>(() => undefined));
      }
    });
  }

  it('pairing phase shows the scanner number huge while the camera is still starting up', () => {
    visitScannerWithPendingCamera();

    // Pairing phase: read out loud across the room while the Annahme operator picks this
    // scanner, so it has to be the dominant thing on screen before the camera takes over.
    cy.byTestId('pairing-phase').should('be.visible');
    cy.byTestId('scanner-id').should('be.visible').invoke('text').then((text) => {
      expect(text).to.not.equal('');
      expect(Number(text)).to.be.greaterThan(0);
    });
    cy.byTestId('state-camera').should('have.text', 'Nicht bereit');
  });

  it('hands over to the scanning phase once the camera is ready', () => {
    cy.visit('/anmeldung/scanner');

    // Camera init involves real device/codec negotiation, which can be slower than typical
    // DOM assertions.
    cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');

    // Scanning phase: video preview takes over, scanner number is now just a corner chip.
    cy.byTestId('scanning-phase').should('be.visible');
    cy.byTestId('pairing-phase').should('not.exist');
    cy.byTestId('scanner-id-chip').should('be.visible').and('contain.text', 'Scanner');
  });

  it('QR code scanned from webcam is decoded, sent to the backend and confirmed with full-screen feedback', () => {
    cy.intercept('POST', '/api/scanners/*/results*').as('scanResult');

    cy.visit('/anmeldung/scanner');
    cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');

    // The fake webcam feed (cypress.config.ts) shows a QR code encoding '12345' -
    // decoding it end-to-end confirms the actual scan pipeline, not just camera readiness.
    // Frame-by-frame QR decoding is slower and less deterministic than typical
    // DOM assertions, so this gets a generous timeout too. `scan-feedback-value` is shared by
    // the success and the duplicate-scan overlay, since the very same still frame keeps being
    // decoded and every read after the first is a duplicate of it.
    cy.byTestId('scan-feedback-value', {timeout: 20000}).should('contain.text', '12345');

    cy.wait('@scanResult', {timeout: 20000}).its('request.url').should('include', 'scanResult=12345');

    // Because the fixture video never changes frame, the first decode is a new scan and every
    // one after it is a duplicate of the same code - so the duplicate overlay is what the
    // screen settles on and stays showing.
    cy.byTestId('scan-feedback-duplicate', {timeout: 20000}).should('be.visible');
  });

  it('a failed scanner registration surfaces a connection-lost overlay that a retry can clear', () => {
    let registerCallCount = 0;
    cy.intercept('POST', '/api/scanners/register*', (req) => {
      registerCallCount++;
      if (registerCallCount === 1) {
        req.reply({statusCode: 500});
      } else {
        req.reply({statusCode: 200, body: {scannerId: 4242}});
      }
    }).as('registerScanner');

    cy.visit('/anmeldung/scanner');
    cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');

    // The camera itself is fine - only the pairing/registration call failed - so this has to
    // show as an overlay on the now-dominant video, not just a small badge nobody notices.
    cy.byTestId('connection-lost-overlay').should('be.visible').and('contain.text', 'Verbindung getrennt');

    cy.byTestId('retry-connection').click();
    cy.wait('@registerScanner');

    cy.byTestId('connection-lost-overlay').should('not.exist');
    cy.byTestId('scanner-id-chip').should('contain.text', '4242');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/anmeldung/scanner');

      // By this point in the spec the fake camera has already negotiated successfully once, so a
      // repeat visit can decode the still-frame QR code fast enough to flip pairing -> scanning
      // before this assertion gets its first retry - and that switch is one-way (see
      // ScannerComponent's `hasStartedScanning`). Accepting either phase confirms the screen
      // rendered correctly on this viewport without racing which one is still showing.
      cy.get('[testid="pairing-phase"], [testid="scanning-phase"]').should('be.visible');
      cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');
      cy.byTestId('scanner-id-chip').should('be.visible');
    });
  });

  describe('accessibility', () => {

    it('has no violations in the pairing phase', () => {
      visitScannerWithPendingCamera();

      cy.byTestId('pairing-phase').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations in the scanning phase', () => {
      cy.visit('/anmeldung/scanner');

      cy.byTestId('state-camera', {timeout: 20000}).should('have.text', 'Bereit');
      cy.byTestId('scanning-phase').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});
