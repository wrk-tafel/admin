describe('User Search', () => {

    beforeEach(() => {
        cy.loginDefault();
        cy.visit('/#/benutzer/suchen');
    });

    it('search by personnelNumber', () => {
        cy.createDummyUser().then(response => {
            const user = response.body;

            cy.byTestId('personnelNumberText').type(user.personnelNumber);
            cy.byTestId('showuser-button').click();

            cy.url().should('include', '/benutzer/detail/' + user.id);
        });
    });

    it('search by lastname and firstname', () => {
        cy.createDummyUser().then(response => {
            const user = response.body;

            cy.byTestId('firstnameText').type(user.firstname);
            cy.byTestId('lastnameText').type(user.lastname);
            cy.byTestId('search-button').click();

            cy.byTestId('searchresult-table').should('be.visible');
            cy.byTestId('searchresult-row').should('have.length', 1);

            cy.byTestId('searchresult-showuser-button-0').first().should('be.visible');

            cy.byTestId('searchresult-showuser-button-0').first().click();
            cy.url().should('include', '/benutzer/detail/' + user.id);
        });
    });

    it('search by lastname only', () => {
        cy.createDummyUser().then(response => {
            const user = response.body;

            cy.byTestId('lastnameText').type(user.lastname);
            cy.byTestId('search-button').click();

            cy.byTestId('searchresult-table').should('be.visible');
            cy.byTestId('searchresult-row').should('have.length', 1);

            cy.byTestId('searchresult-showuser-button-0').first().should('be.visible');

            cy.byTestId('searchresult-showuser-button-0').first().click();
            cy.url().should('include', '/benutzer/detail/' + user.id);
        });
    });

    it('search by firstname only', () => {
        cy.createDummyUser().then(response => {
            const user = response.body;

            cy.byTestId('firstnameText').type(user.firstname);
            cy.byTestId('search-button').click();

            cy.byTestId('searchresult-table').should('be.visible');
            cy.byTestId('searchresult-row').should('have.length', 1);

            cy.byTestId('searchresult-showuser-button-0').first().should('be.visible');

            cy.byTestId('searchresult-showuser-button-0').first().click();
            cy.url().should('include', '/benutzer/detail/' + user.id);
        });
    });

});
