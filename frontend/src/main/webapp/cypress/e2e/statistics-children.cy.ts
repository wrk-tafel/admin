import * as path from 'path';
import dayjs from 'dayjs';
import {CustomerData, Gender} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Statistics Children', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a household member within the default age range', () => {
    createCustomerWithChildAge(8).then((response) => {
      const customer = response.body.data;
      const child = customer.additionalPersons![0];

      cy.visit('/statistiken/auswertung-kinder');

      cy.byTestId('childrenAgeMinInput').should('have.value', '6');
      cy.byTestId('childrenAgeMaxInput').should('have.value', '10');
      cy.byTestId('childrenReferenceDateInput').should('have.value', dayjs().format('YYYY-MM-DD'));

      goToLastResultPage();

      cy.byTestId('children-table')
        .contains('tr', child.lastname)
        .within(() => {
          cy.get('td').eq(0).should('have.text', customer.id!.toString());
          cy.get('td').eq(1).should('have.text', child.firstname);
          cy.get('td').eq(2).should('have.text', child.lastname);
          cy.get('td').eq(3).should('have.text', '8');
        });

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  it('leads with the children count and describes the export', () => {
    createCustomerWithChildAge(8).then(() => {
      cy.visit('/statistiken/auswertung-kinder');

      // .should() retries, .invoke('text') does not - the count starts at 0 until the first
      // response lands
      cy.byTestId('children-count')
        .should(($count) => expect(Number($count.text().trim())).to.be.greaterThan(0));

      cy.byTestId('children-count').invoke('text').then((countText) => {
        const count = Number(countText.trim());

        cy.byTestId('children-headline').should('contain.text', 'Kinder im gewählten Alter');
        cy.byTestId('children-basis')
          .should('contain.text', 'Kinder von 6 bis 10 Jahren')
          .and('contain.text', `Stichtag ${dayjs().format('DD.MM.YYYY')}`);
        cy.byTestId('children-export-hint')
          .should('contain.text', `alle ${count} Treffer`)
          .and('contain.text', 'nicht nur die aktuell angezeigte Seite');
      });

      cy.byTestId('children-age-chart').scrollIntoView().should('be.visible');
    });
  });

  it('excludes a household member outside the given age range', () => {
    createCustomerWithChildAge(20).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/statistiken/auswertung-kinder');

      cy.contains(child.lastname).should('not.exist');
    });
  });

  it('reloads the list when the age range changes', () => {
    createCustomerWithChildAge(15).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/statistiken/auswertung-kinder');
      cy.contains(child.lastname).should('not.exist');

      cy.byTestId('childrenAgeMinInput').clear().type('11');
      cy.byTestId('childrenAgeMaxInput').clear().type('16');
      goToLastResultPage();

      cy.byTestId('children-table').contains(child.lastname).scrollIntoView();
      cy.byTestId('children-table').contains(child.lastname).should('be.visible');
    });
  });

  it('applies the school age preset', () => {
    createCustomerWithChildAge(15).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/statistiken/auswertung-kinder');
      cy.contains(child.lastname).should('not.exist');

      packageCount().then((countBeforePreset) => {
        cy.byTestId('children-preset-button').click();

        cy.byTestId('childrenAgeMinInput').should('have.value', '6');
        cy.byTestId('childrenAgeMaxInput').should('have.value', '15');
        cy.byTestId('children-basis').should('contain.text', 'Kinder von 6 bis 15 Jahren');
        // the 15-year-old just created is inside the preset's range but outside the default one
        cy.byTestId('children-count')
          .should(($count) => expect(Number($count.text().trim())).to.be.greaterThan(countBeforePreset));
      });
    });
  });

  it('rejects an inverted age range instead of querying it', () => {
    cy.visit('/statistiken/auswertung-kinder');
    cy.byTestId('children-basis').should('contain.text', 'Kinder von 6 bis 10 Jahren');

    // "bis" below "von" - typing into "von" instead would pass through a valid single digit first
    cy.byTestId('childrenAgeMaxInput').clear().type('5');

    cy.byTestId('children-filter-error')
      .should('be.visible')
      .and('contain.text', 'darf nicht größer als');
    // the numbers on screen still describe the last range that was actually queried
    cy.byTestId('children-basis').should('contain.text', 'Kinder von 6 bis 10 Jahren');

    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('counts a child by its age on the chosen reference date', () => {
    const turnsSixInThreeMonths = dayjs().subtract(6, 'year').add(3, 'month');

    createCustomerWithChildBirthDate(turnsSixInThreeMonths.toDate()).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/statistiken/auswertung-kinder');
      cy.contains(child.lastname).should('not.exist');

      // narrowed to exactly the age the child reaches on that day, so the assertion doesn't depend
      // on how many other children the e2e data holds
      cy.byTestId('childrenAgeMaxInput').clear().type('6');
      cy.byTestId('childrenReferenceDateInput')
        .clear()
        .type(dayjs().add(3, 'month').format('YYYY-MM-DD'));

      cy.byTestId('children-basis')
        .should('contain.text', `Stichtag ${dayjs().add(3, 'month').format('DD.MM.YYYY')}`);
      goToLastResultPage();
      cy.byTestId('children-table')
        .contains('tr', child.lastname)
        .within(() => cy.get('td').eq(3).should('have.text', '6'));
    });
  });

  it('shows a household number once for its siblings', () => {
    createCustomerWithChildAges([13, 14]).then((response) => {
      const customer = response.body.data;
      const [firstChild, secondChild] = customer.additionalPersons!;

      cy.visit('/statistiken/auswertung-kinder');
      cy.byTestId('childrenAgeMinInput').clear().type('13');
      cy.byTestId('childrenAgeMaxInput').clear().type('14');
      goToLastResultPage();

      // rows of one household are consecutive, so only the first of them repeats the number - which
      // of the two siblings that is depends on the query's ordering, hence the order-free assertion
      householdCellText(firstChild.firstname).then((firstCell) => {
        householdCellText(secondChild.firstname).then((secondCell) => {
          expect([firstCell, secondCell].sort()).to.deep.equal(['', customer.id!.toString()]);
        });
      });
    });
  });

  it('exports the children report as csv', () => {
    cy.visit('/statistiken/auswertung-kinder');

    cy.contains('CSV-Export').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const today = dayjs().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `auswertung_kinder_${today}.csv`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);

    createCustomerWithChildAge(8).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/statistiken/auswertung-kinder');

      cy.byTestId('childrenAgeMinInput').should('be.visible');
      cy.byTestId('children-count').should('be.visible');
      goToLastResultPage();

      cy.byTestId('children-table').should('not.be.visible');
      cy.byTestId('children-cards').scrollIntoView();
      cy.byTestId('children-cards').should('be.visible').and('contain.text', child.lastname);
      cy.get('.tafel-paginator-responsive').should('have.length', 2);
      cy.get('.tafel-paginator-responsive').first().scrollIntoView().should('be.visible');
    });
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);

    createCustomerWithChildAge(8).then(() => {
      cy.visit('/statistiken/auswertung-kinder');

      cy.byTestId('childrenAgeMinInput').should('be.visible');
      cy.byTestId('children-table').should('be.visible');
      cy.byTestId('children-cards').should('not.be.visible');
      cy.get('.tafel-paginator-responsive').should('have.length', 2);
      cy.get('.tafel-paginator-responsive').first().scrollIntoView().should('be.visible');
    });
  });

});

/**
 * The report is ordered by household number ascending and paginated, so a household created by the
 * test is always on the *last* page - which is where a spec has to look for it, rather than
 * assuming the data it just added fits on page one.
 */
function goToLastResultPage() {
  cy.get('.tafel-paginator-responsive').first().find('.mat-mdc-paginator-navigation-last')
    .then(($lastPageButton) => {
      if (!$lastPageButton.prop('disabled')) {
        cy.wrap($lastPageButton).click();
      }
    });
}

function packageCount() {
  return cy.byTestId('children-count')
    .should(($count) => expect(Number($count.text().trim())).to.be.greaterThan(0))
    .invoke('text')
    .then((text: string) => Number(text.trim()));
}

function householdCellText(childFirstname: string) {
  return cy.byTestId('children-table')
    .contains('tr', childFirstname)
    .find('td')
    .eq(0)
    .invoke('text')
    .then((text: string) => text.trim());
}

function createCustomerWithChildAge(age: number) {
  return createCustomerWithChildBirthDate(dayjs().subtract(age, 'year').toDate());
}

function createCustomerWithChildBirthDate(birthDate: Date) {
  return createCustomerWithChildBirthDates([birthDate]);
}

function createCustomerWithChildAges(ages: number[]) {
  return createCustomerWithChildBirthDates(ages.map(age => dayjs().subtract(age, 'year').toDate()));
}

function createCustomerWithChildBirthDates(birthDates: Date[]) {
  return cy.getAnyRandomNumber().then(randomNumber => {
    const data: CustomerData = {
      firstname: 'firstname-' + randomNumber,
      lastname: 'lastname-' + randomNumber,
      birthDate: dayjs().subtract(25, 'year').toDate(),
      gender: Gender.MALE,
      country: {
        id: 165,
        code: 'AT',
        name: 'Österreich'
      },
      income: 1000,
      incomeDue: dayjs().add(30, 'days').toDate(),
      address: {
        street: 'street-' + randomNumber,
        houseNumber: '1A',
        city: 'city-' + randomNumber,
        postalCode: 1234
      },
      validUntil: dayjs().add(1, 'year').toDate(),
      additionalPersons: birthDates.map((birthDate, index) => ({
        id: index,
        key: index,
        firstname: 'child' + index + '-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: birthDate,
        gender: Gender.MALE,
        country: {
          id: 165,
          code: 'AT',
          name: 'Österreich'
        },
        excludeFromHousehold: false,
        receivesFamilyAllowance: false
      }))
    };
    return cy.createCustomer(data);
  });
}
