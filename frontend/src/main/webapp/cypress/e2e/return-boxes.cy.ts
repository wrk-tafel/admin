import {MAIN_CONTENT} from '../support/accessibility';

// Route 3 from the testdata: two return boxes at "Denns BioMarkt" (shop 30) and one at "Basic Bio"
// (shop 31) left over from its last trip. No other spec records a food collection for this route.
const ROUTE_ID = 3;
const SHOP_ID = 30;

describe('Return boxes', () => {
  beforeEach(() => {
    cy.loginDefault();
    // a confirmation persists between specs of the same run - start every test from "still out"
    cy.request('PUT', `/api/return-boxes/routes/${ROUTE_ID}/shops/${SHOP_ID}`, {returned: false});
    cy.visit('/logistik/retourkisten');
  });

  it('lists which boxes each route has to take along, per shop', () => {
    cy.byTestId(`return-boxes-route-${ROUTE_ID}`).should('contain.text', 'Route 3');
    cy.byTestId(`return-boxes-shop-${SHOP_ID}`)
      .should('contain.text', 'Denns BioMarkt')
      .and('contain.text', '4 × Graue Kisten')
      .and('contain.text', '2 × Bananenkartons');
    cy.byTestId('return-boxes-shop-31').should('contain.text', '3 × Klappkisten schwarz');
    // a recorded zero is not an outstanding box
    cy.contains('Ströck Kisten').should('not.exist');

    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('marks a shop\'s boxes as returned and takes it back again', () => {
    cy.byTestId(`return-boxes-returned-${SHOP_ID}`).click();

    cy.byTestId(`return-boxes-undo-${SHOP_ID}`).should('be.visible');
    cy.byTestId(`return-boxes-shop-${SHOP_ID}`).find('[testid="return-boxes-entry"]')
      .should('have.length', 2)
      .and('have.class', 'line-through');

    cy.visit('/logistik/retourkisten');
    cy.byTestId(`return-boxes-undo-${SHOP_ID}`).should('be.visible');

    cy.byTestId(`return-boxes-undo-${SHOP_ID}`).click();
    cy.byTestId(`return-boxes-returned-${SHOP_ID}`).should('be.visible');
  });
});
