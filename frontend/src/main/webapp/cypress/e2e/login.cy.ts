import {UserData} from '../support/commands';

describe('Login', () => {

    beforeEach(() => {
        cy.visit('/#/login');
    });

    it('login button disabled by default', () => {
        cy.byTestId('loginButton').should('be.disabled');
    });

    it('errorMessage hidden by default', () => {
        cy.byTestId('errorMessage').should('not.exist');
    });

    it('login successful', () => {
        enterLoginData('e2etest', 'e2etest');

        cy.url().should('contain', '/uebersicht');
    });

    it('login failed', () => {
        enterLoginData('dummy', 'dummy');

        cy.url().should('contain', '/login');
        cy.byTestId('errorMessage').should('exist');
    });

    it('login with required password change cannot access the dashboard', () => {
        cy.getAnyRandomNumber().then(randomNumber => {
            const testUser: UserData = {
                username: 'username-' + randomNumber,
                personnelNumber: 'personnelnumber-' + randomNumber,
                firstname: 'firstname-' + randomNumber,
                lastname: 'lastname-' + randomNumber,
                enabled: true,
                password: 'dummy-' + randomNumber,
                passwordRepeat: 'dummy-' + randomNumber,
                passwordChangeRequired: true,
                permissions: []
            };

            cy.loginDefault();
            cy.createUser(testUser).then(response => {
                const user = response.body;

                cy.visit('/#/login');

                enterLoginData(user.username, testUser.password);
                cy.url().should('contain', '/login/passwortaendern');

                cy.visit('/#/uebersicht');
                cy.url().should('contain', '/login');
                cy.byTestId('errorMessage').should('exist');
            });
        });
    });

    it('login with required password change cancelled', () => {
        cy.getAnyRandomNumber().then(randomNumber => {
            const testUser: UserData = {
                username: 'username-' + randomNumber,
                personnelNumber: 'personnelnumber-' + randomNumber,
                firstname: 'firstname-' + randomNumber,
                lastname: 'lastname-' + randomNumber,
                enabled: true,
                password: 'dummy-' + randomNumber,
                passwordRepeat: 'dummy-' + randomNumber,
                passwordChangeRequired: true,
                permissions: []
            };

            cy.loginDefault();
            cy.createUser(testUser).then(response => {
                const user = response.body;

                enterLoginData(user.username, testUser.password);

                cy.url().should('contain', '/login/passwortaendern');
                cy.byTestId('cancelButton').click();
                cy.url().should('contain', '/login');
            });
        });
    });

    it('login with required password change and password changed', () => {
        cy.getAnyRandomNumber().then(randomNumber => {
            const testUser: UserData = {
                username: 'username-' + randomNumber,
                personnelNumber: 'personnelnumber-' + randomNumber,
                firstname: 'firstname-' + randomNumber,
                lastname: 'lastname-' + randomNumber,
                enabled: true,
                password: 'dummy-' + randomNumber,
                passwordRepeat: 'dummy-' + randomNumber,
                passwordChangeRequired: true,
                permissions: [
                    {key: 'CHECKIN', title: 'Anmeldung'}
                ]
            };

            cy.loginDefault();
            cy.createUser(testUser).then(response => {
                const user = response.body;

                cy.visit('/#/login');

                enterLoginData(user.username, testUser.password);
                cy.url().should('contain', '/login/passwortaendern');

                cy.byTestId('currentPasswordText').type(testUser.password);
                cy.byTestId('newPasswordText').type('11111111');
                cy.byTestId('newRepeatedPasswordText').type('11111111');

                cy.byTestId('saveButton').click();
                cy.url().should('contain', '/uebersicht');
            });
        });
    });

    function enterLoginData(username: string, password: string) {
        cy.byTestId('username').type(username);
        cy.byTestId('password').type(password);
        cy.byTestId('loginButton').click();
    }

});
