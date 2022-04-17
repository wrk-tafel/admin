// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('byTestId', (id) => cy.get(`[testid="${id}"]`));

Cypress.Commands.add('login', (username, password) => {
    cy.visit('#/login');
    cy.byTestId('username').type(username);
    cy.byTestId('password').type(password);
    cy.byTestId('loginButton').click();
});

Cypress.Commands.add('loginWithTestuser', () => {
    let username = 'e2etest';
    let password = 'e2etest';
    cy.login(username, password);
});

Cypress.Commands.add('loginHeadlessWithTestuser', () => {
    let username = 'e2etest';
    let password = 'e2etest';

    cy.request({
        method: 'POST',
        url: '/api/login',
        body: 'username=' + username + '&password=' + password,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    }).then((response) => {
        const token = response.body.token;
        sessionStorage.setItem('JWT_TOKEN', token);
    });
});
