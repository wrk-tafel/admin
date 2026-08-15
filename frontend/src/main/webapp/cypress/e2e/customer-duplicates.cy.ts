import dayjs from 'dayjs';
import {CustomerData, Gender} from '../support/commands';
import {MAIN_CONTENT} from '../support/accessibility';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

// The merge screen is a stepper: the fields are picked on step 1, and the confirm button only
// exists on step 3 behind the acknowledgement checkbox.
function goToConfirmStep() {
  cy.byTestId('merge-next-persons-button').click();
  cy.byTestId('merge-next-confirm-button').click();
  cy.byTestId('merge-confirm-checkbox').click();
}

function confirmMerge() {
  goToConfirmStep();
  cy.byTestId('merge-confirm-button').click();
}

describe('Customer Duplicates', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a detected duplicate pair as a comparison table with both customers\' details', () => {
    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');

      cy.byTestId('duplicates-total-label').should('contain.text', 'mögliche');

      cy.byTestId('duplicate-candidate-' + customer1.id).within(() => {
        cy.byTestId('duplicate-candidate-name-' + customer1.id)
          .should('contain.text', customer1.lastname)
          .and('contain.text', customer1.firstname);
      });
      cy.byTestId('duplicate-candidate-' + customer2.id).within(() => {
        cy.byTestId('duplicate-candidate-name-' + customer2.id)
          .should('contain.text', customer2.lastname)
          .and('contain.text', customer2.firstname);
      });

      cy.byTestId('duplicate-field-birthDate').should('contain.text', dayjs(customer1.birthDate).format('DD.MM.YYYY'));
      cy.byTestId('duplicate-field-address').should('contain.text', customer1.address.street);
    });
  });

  it('navigates to the customer detail page', () => {
    createDuplicatePair().then(({first}) => {
      const customer1 = first.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-detail-button-' + customer1.id).click();

      cy.url().should('include', '/kunden/detail/' + customer1.id);
    });
  });

  it('deletes a single customer from the duplicate pair after confirming, naming the customer in the dialog', () => {
    createDuplicatePair().then(({second}) => {
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-actions-menu-' + customer2.id).click();
      cy.byTestId('duplicate-delete-button-' + customer2.id).click();

      cy.byTestId('deletecustomer-dialog').should('be.visible');
      // the dialog exists only after this click, so no other accessibility gate sees it -
      // see cypress/support/accessibility.ts
      cy.checkDialogAccessibility();
      cy.byTestId('deletecustomer-name').should('contain.text', customer2.lastname).and('contain.text', customer2.firstname);

      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('cancelButton').click();
      });

      cy.byTestId('deletecustomer-dialog').should('not.exist');
      cy.byTestId('duplicate-candidate-' + customer2.id).should('exist');

      cy.byTestId('duplicate-actions-menu-' + customer2.id).click();
      cy.byTestId('duplicate-delete-button-' + customer2.id).click();
      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('okButton').click();
      });

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde wurde gelöscht!');
      cy.byTestId('duplicate-candidate-' + customer2.id).should('not.exist');
    });
  });

  it('marks a pair as "kein Duplikat" and it no longer appears in the list', () => {
    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-actions-menu-' + customer2.id).click();
      cy.byTestId('duplicate-dismiss-button-' + customer2.id).click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'kein Duplikat');
      // The pair itself disappearing is the assertion here - the list as a whole is usually NOT
      // empty at this point, since the other tests' pairs accumulate in the shared e2e database.
      cy.byTestId('duplicate-group-' + customer1.id).should('not.exist');
    });
  });

  it('shows the empty state once no duplicates are left', () => {
    // Stubbed: the shared e2e database accumulates duplicate pairs from the other tests here, so a
    // really-empty list cannot be arranged through the UI alone.
    cy.intercept('GET', '**/api/households/duplicates*', {
      statusCode: 200,
      body: {items: [], totalCount: 0, currentPage: 1, totalPages: 0, pageSize: 10},
    });
    cy.visit('/kunden/duplikate');

    cy.byTestId('no-duplicates-message').should('be.visible').and('contain.text', 'Keine Duplikate gefunden!');
  });

  it('the "kein Duplikat" action is only offered on the similar candidates, not the anchor itself', () => {
    createDuplicatePair().then(({first}) => {
      const customer1 = first.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-actions-menu-' + customer1.id).click();
      cy.byTestId('duplicate-dismiss-button-' + customer1.id).should('not.exist');
    });
  });

  it('opens the merge picker for the duplicate pair', () => {
    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + customer1.id).click();

      cy.url().should('include', `/kunden/zusammenfuehren/${customer1.id}`);
      cy.url().should('include', `quellen=${customer2.id}`);
    });
  });

  it('stays usable at phone width - the comparison table scrolls horizontally and deletion still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');

      // the card itself must not overflow the page sideways ...
      cy.byTestId('duplicate-group-' + customer1.id).then(($group) => {
        expect($group[0].getBoundingClientRect().width).to.be.at.most(Cypress.config('viewportWidth'));
      });
      // ... instead the comparison table scrolls inside the card
      cy.byTestId('duplicate-group-scroller-' + customer1.id).then(($scroller) => {
        expect($scroller[0].scrollWidth).to.be.greaterThan($scroller[0].clientWidth);
      });

      cy.byTestId('duplicate-actions-menu-' + customer2.id).scrollIntoView().click();
      cy.byTestId('duplicate-delete-button-' + customer2.id).click();
      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('okButton').click();
      });

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde wurde gelöscht!');
      cy.byTestId('duplicate-candidate-' + customer2.id).should('not.exist');
    });
  });

  it('shows both candidates without scrolling at tablet width and merge still works', () => {
    cy.viewport(TABLET_VIEWPORT);

    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');

      cy.byTestId('duplicate-candidate-' + customer1.id).should('be.visible');
      cy.byTestId('duplicate-candidate-' + customer2.id).should('be.visible');

      cy.byTestId('duplicate-merge-button-' + customer1.id).click();

      cy.url().should('include', `/kunden/zusammenfuehren/${customer1.id}`);
    });
  });

});

describe('Customer Merge', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('picks a conflicting field from the source and applies it to the target', () => {
    createDuplicatePair({telephoneNumber: '111111'}, {telephoneNumber: '222222'}).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      cy.url().should('include', `/kunden/zusammenfuehren/${target.id}`);
      cy.byTestId('merge-field-TELEPHONE_NUMBER-source-' + source.id).click();
      confirmMerge();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('telephoneNumberText').should('contain.text', '222222');
    });
  });

  it('compares the customers column by column and marks a value both of them share', () => {
    createDuplicatePair({telephoneNumber: '111111'}, {telephoneNumber: '222222'}).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      // one column per customer, the surviving one first and marked as such
      cy.byTestId('merge-column-' + target.id).should('contain.text', 'bleibt bestehen');
      cy.byTestId('merge-column-' + source.id).should('contain.text', 'wird gelöscht');

      cy.byTestId('merge-field-row-TELEPHONE_NUMBER').within(() => {
        cy.byTestId('merge-field-TELEPHONE_NUMBER-target').should('contain.text', '111111');
        cy.byTestId('merge-field-TELEPHONE_NUMBER-source-' + source.id).should('contain.text', '222222');
      });

      // the pair only differs in its telephone number, so the address is offered on the target
      // column alone and the source's cell says there is nothing to pick
      cy.byTestId('merge-field-row-ADDRESS').should('not.exist');
      cy.byTestId('merge-toggle-identical-fields').click();
      cy.byTestId('merge-identical-fields').should('contain.text', 'Adresse');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });

  it('names the customers that get deleted and only merges once that is acknowledged', () => {
    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      cy.byTestId('merge-next-persons-button').click();
      cy.byTestId('merge-next-confirm-button').click();

      // visited steps keep their number - the default edit icon is a Material-Icons font ligature
      // this app doesn't ship, which would render as clipped raw text ("cr")
      cy.byTestId('merge-stepper').find('.mat-step-header .mat-step-icon').eq(0).should('have.text', '1');
      cy.byTestId('merge-stepper').find('.mat-step-header .mat-step-icon').eq(1).should('have.text', '2');

      cy.byTestId('merge-danger-banner')
        .should('contain.text', 'kann nicht rückgängig gemacht werden')
        .and('contain.text', `${source.id}`);
      cy.byTestId('merge-confirm-button').should('be.disabled');
      // the confirm step is only reachable after two "Weiter" clicks, so nothing audited it before
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('merge-confirm-checkbox').click();
      cy.byTestId('merge-confirm-button').should('not.be.disabled').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
    });
  });

  it('highlights only the fields a source value overwrites in the final summary', () => {
    createDuplicatePair({telephoneNumber: '111111'}, {telephoneNumber: '222222'}).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      cy.byTestId('merge-field-TELEPHONE_NUMBER-source-' + source.id).click();
      cy.byTestId('merge-next-persons-button').click();
      cy.byTestId('merge-next-confirm-button').click();

      cy.byTestId('merge-changed-summary').should('contain.text', '1 Feld(er)');
      cy.byTestId('merge-resolved-TELEPHONE_NUMBER').should('contain.text', '222222');
      cy.byTestId('merge-previous-TELEPHONE_NUMBER').should('contain.text', '111111');
      cy.byTestId('merge-previous-EMAIL').should('not.exist');
    });
  });

  it('stacks the conflict columns and turns the stepper vertical on phone', () => {
    cy.viewport(PHONE_VIEWPORT);

    createDuplicatePair({telephoneNumber: '111111'}, {telephoneNumber: '222222'}).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      cy.byTestId('merge-stepper').should('have.class', 'mat-stepper-vertical');
      // below md: the column headers make no sense, each cell names its customer instead
      cy.byTestId('merge-column-' + target.id).should('not.be.visible');
      cy.byTestId('merge-field-TELEPHONE_NUMBER-source-' + source.id)
        .scrollIntoView()
        .should('be.visible')
        .and('contain.text', `Kunde ${source.id}`);

      cy.byTestId('merge-field-TELEPHONE_NUMBER-target').then(($targetCell) => {
        const targetTop = $targetCell[0].getBoundingClientRect().top;
        cy.byTestId('merge-field-TELEPHONE_NUMBER-source-' + source.id).then(($sourceCell) => {
          expect($sourceCell[0].getBoundingClientRect().top).to.be.greaterThan(targetTop);
        });
      });
    });
  });

  it('re-parents an additional person that only exists on the source', () => {
    createDuplicatePair({}, {
      additionalPersons: [{
        key: 0,
        id: 0,
        firstname: 'Peter',
        lastname: 'Novak',
        birthDate: dayjs().subtract(40, 'year').toDate(),
        gender: Gender.MALE,
        country: {id: 165, code: 'AT', name: 'Österreich'},
        excludeFromHousehold: false,
        receivesFamilyAllowance: false
      }]
    }).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-next-persons-button').click();
      cy.byTestId('merge-person-group-' + source.id).should('contain.text', 'wird übernommen');
      cy.byTestId('merge-next-confirm-button').click();
      cy.byTestId('merge-confirm-checkbox').click();
      cy.byTestId('merge-confirm-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('additionalpersons-tab-label').click();
      cy.byTestId('addperson-0-lastnameText').should('contain.text', 'Novak');
    });
  });

  it('deduplicates an additional person that exists identically on both target and source', () => {
    const sharedPerson = (): any => ({
      key: 0,
      id: 0,
      firstname: 'Anna',
      lastname: 'Schmidt',
      birthDate: dayjs().subtract(35, 'year').toDate(),
      gender: Gender.FEMALE,
      country: {id: 165, code: 'AT', name: 'Österreich'},
      excludeFromHousehold: false,
      receivesFamilyAllowance: false
    });

    createDuplicatePair(
      {additionalPersons: [sharedPerson()]},
      {additionalPersons: [sharedPerson()]}
    ).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-next-persons-button').click();
      cy.byTestId('merge-person-group-' + source.id).should('contain.text', 'bereits vorhanden');
      cy.byTestId('merge-next-confirm-button').click();
      cy.byTestId('merge-confirm-checkbox').click();
      cy.byTestId('merge-confirm-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('additionalpersons-tab-label').click();
      cy.byTestId('addperson-0-lastnameText').should('contain.text', 'Schmidt');
      cy.byTestId('addperson-1-lastnameText').should('not.exist');
    });
  });

  it('re-parents a note from the source onto the target', () => {
    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.createCustomerNote(source.id!, 'note from the merged-away source');

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      confirmMerge();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('note-text').should('contain.text', 'note from the merged-away source');
    });
  });

  it('warns about a same-distribution ticket collision and still lets the merge succeed', () => {
    cy.createDistribution();

    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.addCustomerToDistribution({customerId: target.id!, ticketNumber: 11});
      cy.addCustomerToDistribution({customerId: source.id!, ticketNumber: 22});

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      // the ticket collision is part of step 2, next to the persons it is decided together with
      cy.byTestId('merge-next-persons-button').click();
      cy.contains('22').should('be.visible');
      cy.contains('wird verworfen').should('be.visible');

      cy.byTestId('merge-next-confirm-button').click();
      cy.byTestId('merge-confirm-checkbox').click();
      cy.byTestId('merge-confirm-button').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');

      cy.closeDistribution();
    });
  });

  it('cancel returns to the duplicates list without merging', () => {
    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-cancel-button').click();

      cy.url().should('include', '/kunden/duplikate');
      cy.byTestId('duplicate-candidate-' + target.id).should('exist');
      cy.byTestId('duplicate-candidate-' + source.id).should('exist');
    });
  });

  it('cancel comes back to the queue position the merge was started from', () => {
    // two pairs, so there is a page 2 at all - the queue shows one pair per page
    createDuplicatePair().then(() => createDuplicatePair()).then(() => {
      cy.visit('/kunden/duplikate?seite=2');
      cy.byTestId('duplicates-announcement').should('contain.text', 'Seite 2');

      // whichever candidate page 2 holds - the order the backend returns them in is not this
      // test's subject, coming back to the same page is
      cy.get('mat-card[testid^=duplicate-group-]').invoke('attr', 'testid').then((pairTestId) => {
        cy.get('[testid^=duplicate-merge-button-]').first().click();
        cy.url().should('include', 'seite=2');

        cy.byTestId('merge-cancel-button').click();

        cy.url().should('include', '/kunden/duplikate?seite=2');
        cy.get(`[testid="${pairTestId}"]`).should('exist');
      });
    });
  });

});

function createDuplicatePair(firstOverrides: Partial<CustomerData> = {}, secondOverrides: Partial<CustomerData> = {}) {
  return cy.getAnyRandomNumber().then(randomNumber => {
    const buildCustomer = (): CustomerData => ({
      firstname: 'Firstname' + randomNumber,
      lastname: 'Lastname' + randomNumber,
      birthDate: dayjs().subtract(30, 'year').toDate(),
      gender: Gender.MALE,
      country: {
        id: 165,
        code: 'AT',
        name: 'Österreich'
      },
      income: 1000,
      incomeDue: dayjs().add(30, 'days').toDate(),
      address: {
        street: 'Duplicatestreet' + randomNumber,
        houseNumber: '1',
        city: 'city-' + randomNumber,
        postalCode: 1234
      },
      validUntil: dayjs().add(1, 'year').toDate()
    });

    return cy.createCustomer({...buildCustomer(), ...firstOverrides}).then(first =>
      cy.createCustomer({...buildCustomer(), ...secondOverrides}).then(second => ({first, second}))
    );
  });
}
