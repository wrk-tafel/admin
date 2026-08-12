import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Statistics General', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/statistiken/allgemein');
  });

  it('defaults to the current year and shows the aggregated data', () => {
    const currentYear = dayjs().year();
    cy.byTestId('yearInput').should('contain.text', currentYear.toString());

    const from = dayjs().startOf('year').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    cy.contains(`Zeitraum: ${from} - ${to}`).should('be.visible');

    cy.contains('Kunden und Personen').should('be.visible');
    cy.contains('Notschlafstellen').scrollIntoView().should('be.visible');
    cy.contains('Transport- / Logistik').scrollIntoView().should('be.visible');
  });

  it('compares every key figure with the same period of the year before', () => {
    const previousFrom = dayjs().startOf('year').subtract(1, 'year').format('DD.MM.YYYY');
    const previousTo = dayjs().subtract(1, 'year').format('DD.MM.YYYY');

    cy.byTestId('rangeSummary').should('contain.text', `Verglichen mit ${previousFrom} - ${previousTo}`);
    cy.byTestId('statisticsPanel-beneficiaryCustomers').within(() => {
      cy.byTestId('panel-delta').should('contain.text', 'ggü. Vorjahr');
      // an axis-less sparkline shows a shape only - the numbers bounding it are written out beside it
      cy.byTestId('panel-scale').should('contain.text', 'Min').and('contain.text', 'Zuletzt');
    });
  });

  it('shows a placeholder on the cards while the numbers are loading', () => {
    cy.intercept('GET', '/api/statistics/data*', request => {
      request.on('response', response => {
        response.setDelay(1000);
      });
    }).as('slowData');

    cy.reload();

    cy.byTestId('statisticsPanel-beneficiaryCustomers-skeleton').should('be.visible');
    cy.wait('@slowData');
    cy.byTestId('statisticsPanel-beneficiaryCustomers-skeleton').should('not.exist');
    cy.byTestId('statisticsPanel-beneficiaryCustomers').should('be.visible');
  });

  it('opens the enlarged chart of a key figure', () => {
    cy.byTestId('statisticsPanel-beneficiaryPersons').click();

    cy.byTestId('statistics-detail-dialog').should('be.visible');
    cy.byTestId('statistics-detail-dialog').within(() => {
      cy.byTestId('title').should('contain.text', 'Bezugsberechtigte Personen');
      cy.byTestId('statistics-detail-range')
        .should('contain.text', dayjs().startOf('year').format('DD.MM.YYYY'));
      cy.byTestId('statistics-detail-chart').should('be.visible');
      cy.byTestId('statistics-detail-summary').should('contain.text', 'Minimum');
    });

    cy.checkDialogAccessibility();

    cy.byTestId('statistics-detail-dialog').within(() => cy.byTestId('closeButton').click());
    cy.byTestId('statistics-detail-dialog').should('not.exist');
  });

  it('switches to current month mode and updates the shown range', () => {
    cy.byTestId('dateRangeModeInput').contains('Aktuelles Monat').click();

    cy.byTestId('yearInput').should('not.exist');

    const from = dayjs().startOf('month').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    cy.contains(`Zeitraum: ${from} - ${to}`).should('be.visible');
    cy.byTestId('rangeSummary').should('contain.text', 'ggü. Vormonat');
  });

  it('switches to the previous year in one click', () => {
    const previousYear = dayjs().year() - 1;
    cy.byTestId('dateRangeModeInput').contains('Vorjahr').click();

    cy.byTestId('previousYearHint').should('contain.text', `Gesamtes Jahr ${previousYear}`);
    cy.contains(`Zeitraum: 01.01.${previousYear} - 31.12.${previousYear}`).should('be.visible');
    cy.byTestId('rangeSummary').should('contain.text', `01.01.${previousYear - 1} - 31.12.${previousYear - 1}`);
  });

  it('switches to a custom date range and updates the shown range', () => {
    cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').click();

    cy.intercept('GET', '/api/statistics/data?fromDate=2024-01-01&toDate=2024-06-30').as('customRangeData');

    cy.byTestId('dataRangeFromInput').clear().type('2024-01-01');
    cy.byTestId('dataRangeToInput').clear().type('2024-06-30');

    cy.wait('@customRangeData');
    cy.contains('Zeitraum: 01.01.2024 - 30.06.2024').should('be.visible');
    cy.byTestId('rangeSummary').should('contain.text', 'ggü. Vorperiode');
  });

  it('rejects a custom range that ends before it starts', () => {
    cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').click();

    cy.intercept('GET', '/api/statistics/data?fromDate=2024-06-30&toDate=2024-06-30').as('validRangeData');
    cy.byTestId('dataRangeFromInput').clear().type('2024-06-30');
    cy.byTestId('dataRangeToInput').clear().type('2024-06-30');
    cy.wait('@validRangeData');

    cy.byTestId('dataRangeToInput').clear().type('2024-01-01');

    cy.byTestId('dateRangeError').should('be.visible');
    cy.byTestId('csvExportButton').should('be.disabled');
    // the last valid answer stays on screen instead of being replaced by an unanswerable one
    cy.contains('Zeitraum: 30.06.2024 - 30.06.2024').should('be.visible');
  });

  it('says outright when the range holds no distribution', () => {
    cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').click();

    cy.intercept('GET', '/api/statistics/data?fromDate=2010-01-01&toDate=2010-12-31').as('emptyRangeData');
    cy.byTestId('dataRangeFromInput').clear().type('2010-01-01');
    cy.byTestId('dataRangeToInput').clear().type('2010-12-31');
    cy.wait('@emptyRangeData');

    cy.byTestId('noDistributionsHint').should('be.visible');
    cy.byTestId('rangeSummary').should('contain.text', '0 Ausgaben im Zeitraum');
  });

  it('drives the date range from a selected past distribution', () => {
    cy.createDistribution();
    cy.closeDistribution();

    cy.reload();
    cy.byTestId('dateRangeModeInput').contains('Ausgabe').click();

    const today = dayjs().format('DD.MM.YYYY');
    // Distributions accumulate across test runs, so several options can share today's date -
    // select by position (the freshly closed one sorts first, right after the blank placeholder)
    // rather than by text.
    cy.byTestId('distributionDateInput').click();
    // the weekday is what tells the distributions apart in the list
    cy.get('mat-option').eq(1).invoke('text').should('contain', today);
    cy.get('mat-option').eq(1).invoke('text').should('match', /^\S+, \d{2}\.\d{2}\.\d{4}$/);
    cy.get('mat-option').eq(1).click();

    cy.contains(`Zeitraum: ${today} - ${today}`).should('be.visible');
  });

  it('exports the statistics as csv for the selected range', () => {
    cy.byTestId('exportHint').should('contain.text', 'eine Zeile je Kennzahl');
    cy.byTestId('csvExportButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const from = dayjs().startOf('year').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `statistik_export_${from}_bis_${to}.csv`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));
  });

  it('switches to a custom date range and updates the shown range on phone', () => {
    cy.viewport(PHONE_VIEWPORT);

    // The Zeitraum toggle group (Jahr/Vorjahr/Aktuelles Monat/Ausgabe/Benutzerdefiniert) is wider
    // than a phone viewport - it scrolls horizontally within its own wrapper (overflow-x-auto)
    // instead of pushing the whole page into horizontal scroll. Assert that explicitly, since a
    // plain .click() below would still succeed even if this regressed (Cypress auto-scrolls
    // whichever ancestor is scrollable to reach the target, so it wouldn't otherwise catch the
    // page-level overflow).
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });

    // below the sm: breakpoint the date range card and the "von"/"bis" label+input pairs stack in a single column
    cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').click();

    cy.intercept('GET', '/api/statistics/data?fromDate=2024-01-01&toDate=2024-06-30').as('customRangeData');

    cy.byTestId('dataRangeFromInput').should('be.visible').clear().type('2024-01-01');
    cy.byTestId('dataRangeToInput').should('be.visible').clear().type('2024-06-30');

    cy.wait('@customRangeData');
    cy.contains('Zeitraum: 01.01.2024 - 30.06.2024').should('be.visible');

    cy.contains('Kunden und Personen').should('be.visible');
    cy.contains('Notschlafstellen').scrollIntoView().should('be.visible');
    cy.contains('Transport- / Logistik').scrollIntoView().should('be.visible');
  });

  it('shows the period picker and the export side by side at tablet width', () => {
    cy.viewport(TABLET_VIEWPORT);

    // the export covers the picked range, so it sits in that row rather than in a card of its own
    const currentYear = dayjs().year();
    cy.byTestId('yearInput').should('be.visible').and('contain.text', currentYear.toString());
    cy.byTestId('csvExportButton').should('be.visible');

    cy.contains('Kunden und Personen').should('be.visible');
  });

  // Only the `year` controls exist on the initial render, which is all the Lighthouse `pages`
  // sweep ever grades - the other three modes' controls are created by the toggle.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations in any of the date range modes', () => {
      cy.byTestId('yearInput').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('dateRangeModeInput').contains('Vorjahr').click();
      cy.byTestId('previousYearHint').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('dateRangeModeInput').contains('Aktuelles Monat').click();
      cy.byTestId('yearInput').should('not.exist');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('dateRangeModeInput').contains('Ausgabe').click();
      cy.byTestId('distributionDateInput').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').click();
      cy.byTestId('dataRangeFromInput').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});
