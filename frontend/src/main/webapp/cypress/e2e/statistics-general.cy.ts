import * as path from 'path';
import dayjs from 'dayjs';

describe('Statistics General', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/statistiken/allgemein');
  });

  it('defaults to the current year and shows the aggregated data', () => {
    const currentYear = dayjs().year();
    cy.byTestId('yearInput').should('contain.text', currentYear.toString());

    const from = dayjs().startOf('year').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    cy.contains(`Zeitraum: ${from} - ${to}`).should('be.visible');

    cy.contains('Kunden und Personen').should('be.visible');
    cy.contains('Notschlafstellen').should('be.visible');
    cy.contains('Transport- / Logistik').should('be.visible');
  });

  it('switches to current month mode and updates the shown range', () => {
    cy.byTestId('dateRangeModeInput').contains('Aktuelles Monat').click();

    cy.byTestId('yearInput').should('not.exist');

    const from = dayjs().startOf('month').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    cy.contains(`Zeitraum: ${from} - ${to}`).should('be.visible');
  });

  it('switches to a custom date range and updates the shown range', () => {
    cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').click();

    cy.intercept('GET', '/api/statistics/data?fromDate=2024-01-01&toDate=2024-06-30').as('customRangeData');

    cy.byTestId('dataRangeFromInput').clear().type('2024-01-01');
    cy.byTestId('dataRangeToInput').clear().type('2024-06-30');

    cy.wait('@customRangeData');
    cy.contains('Zeitraum: 01.01.2024 - 30.06.2024').should('be.visible');
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
    cy.get('mat-option').eq(1).invoke('text').should('equal', today);
    cy.get('mat-option').eq(1).click();

    cy.contains(`Zeitraum: ${today} - ${today}`).should('be.visible');
  });

  it('exports the statistics as csv for the selected range', () => {
    cy.contains('CSV-Export').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const from = dayjs().startOf('year').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `statistik_export_${from}_bis_${to}.csv`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));
  });

});
