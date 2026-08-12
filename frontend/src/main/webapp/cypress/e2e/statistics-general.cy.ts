import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Statistics General', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/statistiken/allgemein');
  });

  it('defaults to the running year and shows the aggregated data', () => {
    const currentYear = dayjs().year();
    cy.byTestId('currentYearHint').should('contain.text', `Laufendes Jahr ${currentYear}`);
    // the running year needs no control of its own - only "Jahr" does
    cy.byTestId('yearInput').should('not.exist');

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

  // The three years of weekly distributions in the testdata are what make this assertable: against
  // a fixture whose households never expire and that holds one distribution, both periods answer
  // the same number and every card reads "0". See db-migration-testdata/testdata.sql.
  it('states a real change per key figure, not a flat zero', () => {
    // logistics is recorded per distribution, so this one moves whenever the compared years hold
    // different collections - which the seeded history makes sure they do
    cy.byTestId('statisticsPanel-shopItemsTotal').within(() => {
      cy.byTestId('panel-delta')
        .invoke('text')
        .should('match', /[+-]\d/);
    });

    cy.byTestId('statisticsPanel-shopItemsTotal').within(() => {
      // a course rather than one repeated value: its lowest and highest point differ
      cy.byTestId('panel-scale').invoke('text').then((text) => {
        const [minimum, maximum] = text.match(/[\d.,]+/g)!;
        expect(minimum).not.to.equal(maximum);
      });
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

  it('gives the enlarged chart the phone screen it needs', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.byTestId('statisticsPanel-beneficiaryPersons').click();

    // The chart is the whole reason this dialog exists, so on a phone it takes what the viewport
    // has rather than the width a dialog sized by its own text would settle on. Measured against
    // the window rather than Cypress.config('viewportWidth'), which keeps reporting the configured
    // desktop width after cy.viewport(), and asserted through .and() so it retries: Chart.js sizes
    // the canvas off the dialog surface, which is still scaling up while the dialog opens.
    cy.window().then((win) => {
      cy.byTestId('statistics-detail-chart')
        .should('be.visible')
        .and(($canvas) => {
          expect($canvas[0].getBoundingClientRect().width).to.be.greaterThan(win.innerWidth * 0.75);
        });
    });
  });

  it('switches to current month mode and updates the shown range', () => {
    cy.byTestId('dateRangeModeInput').contains('Aktuelles Monat').click();

    cy.byTestId('yearInput').should('not.exist');

    const from = dayjs().startOf('month').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    cy.contains(`Zeitraum: ${from} - ${to}`).should('be.visible');
    cy.byTestId('rangeSummary').should('contain.text', 'ggü. Vormonat');
  });

  // "Jahr" is the only one of the three year modes with a control of its own - the toggle is
  // matched exactly, since "Aktuelles Jahr" contains its label
  const YEAR_TOGGLE = /^\s*Jahr\s*$/;

  it('picks a specific year through the year mode', () => {
    const previousYear = dayjs().year() - 1;
    cy.byTestId('dateRangeModeInput').contains(YEAR_TOGGLE).click();

    cy.byTestId('yearInput').should('be.visible').click();
    cy.byTestId('yearInput-option-' + previousYear).click();

    cy.contains(`Zeitraum: 01.01.${previousYear} - 31.12.${previousYear}`).should('be.visible');
    cy.byTestId('rangeSummary').should('contain.text', 'ggü. Vorjahr');
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

    // The Zeitraum toggle group (Aktuelles Jahr/Vorjahr/Jahr/Aktuelles Monat/Ausgabe/
    // Benutzerdefiniert) is wider
    // than a phone viewport, so it wraps onto a second line - every period stays on screen and the
    // page itself never scrolls sideways. Both halves are asserted: a plain .click() below would
    // still succeed if this regressed into a scrolling group (Cypress auto-scrolls whichever
    // ancestor is scrollable to reach the target), and nothing else notices an option that can
    // only be reached by dragging.
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
    cy.byTestId('dateRangeModeInput').then(($group) => {
      expect($group[0].scrollWidth).to.be.at.most($group[0].clientWidth);
    });
    cy.byTestId('dateRangeModeInput').contains('Benutzerdefiniert').should('be.visible');

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

  it('puts the export in the picker block\'s bottom right corner on a desktop', () => {
    // the export covers the picked range, so it shares that block rather than sitting in a card of
    // its own - in the corner a form's confirming button belongs in: beside the picker, level with
    // its last line
    cy.byTestId('exportHint').then(($hint) => {
      cy.byTestId('csvExportButton').then(($button) => {
        const hint = $hint[0].getBoundingClientRect();
        const button = $button[0].getBoundingClientRect();
        expect(button.left, 'beside the picker, not under it').to.be.at.least(hint.right);
        expect(button.bottom, 'level with the block\'s last line').to.be.closeTo(hint.bottom, 5);
      });
    });
  });

  it('moves the export under the period picker at tablet width', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.byTestId('currentYearHint').should('be.visible');

    // there is no room for a second column here, so the export becomes what it reads as on a
    // narrow screen: the panel's closing, full-width action under the range it exports
    cy.byTestId('exportHint').then(($hint) => {
      cy.byTestId('csvExportButton').should('be.visible').then(($button) => {
        expect($button[0].getBoundingClientRect().top)
          .to.be.at.least($hint[0].getBoundingClientRect().bottom);
      });
    });

    cy.contains('Kunden und Personen').should('be.visible');
  });

  // Only the `year` controls exist on the initial render, which is all the Lighthouse `pages`
  // sweep ever grades - the other three modes' controls are created by the toggle.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations in any of the date range modes', () => {
      cy.byTestId('currentYearHint').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('dateRangeModeInput').contains('Vorjahr').click();
      cy.byTestId('previousYearHint').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('dateRangeModeInput').contains(YEAR_TOGGLE).click();
      cy.byTestId('yearInput').should('be.visible');
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
