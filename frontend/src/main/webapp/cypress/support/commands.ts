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

import Chainable = Cypress.Chainable;
import dayjs from 'dayjs';

Cypress.Commands.add(
  'byTestId',
  (id, options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow>) =>
    cy.get(`[testid="${id}"]`, options)
);

// Some responsive pages render the same testid twice (once per Tailwind `hidden md:block` /
// `block md:hidden` branch) so only one is ever CSS-displayed at a time. Cypress's `:visible`
// filter isn't safe to disambiguate them with, because it also treats an element scrolled outside
// a clipping ancestor (e.g. a horizontally-scrollable table on a narrow viewport) as "not visible" -
// which would incorrectly filter out the real match before a click ever gets the chance to scroll it
// into view. `offsetParent` is null only when the element (or an ancestor) is actually
// `display: none`, regardless of scroll position, so it isolates the currently-active branch.
Cypress.Commands.add('filterDisplayed', {prevSubject: true}, (subject) =>
  cy.wrap((subject as JQuery).filter((_, el) => (el as HTMLElement).offsetParent !== null))
);

// The backend requires the X-XSRF-TOKEN header (mirroring the XSRF-TOKEN cookie) on every
// mutating request. The Angular app handles this via its xsrfInterceptor - direct cy.request
// calls need the header injected here.
Cypress.Commands.overwrite('request', (originalFn, ...args: any[]): Cypress.Chainable<Cypress.Response<any>> => {
  const options: Partial<Cypress.RequestOptions> = {};
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    Object.assign(options, args[0]);
  } else if (args.length === 1) {
    options.url = args[0];
  } else if (args.length === 2) {
    options.method = args[0];
    options.url = args[1];
  } else if (args.length === 3) {
    options.method = args[0];
    options.url = args[1];
    options.body = args[2];
  }

  const method = (options.method ?? 'GET').toString().toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return originalFn(options as Cypress.RequestOptions);
  }

  const failOnStatusCode = options.failOnStatusCode !== false;

  const send = (tokenValue: string | undefined): Cypress.Chainable<Cypress.Response<any>> => {
    const headers = tokenValue ? {'X-XSRF-TOKEN': tokenValue, ...options.headers} : options.headers;
    return originalFn({...options, headers, failOnStatusCode: false} as Cypress.RequestOptions);
  };

  // The XSRF-TOKEN cookie can rotate concurrently (e.g. a background request completing) between
  // reading it and this request reaching the server, so the header we sent no longer matches the
  // cookie Cypress auto-attached, causing a 403. It can keep rotating out from under us, so bound
  // the retries rather than assuming a single retry always lands on a stable value. Only retry
  // when the cookie actually changed though - if it's the same as what we just sent, this 403
  // isn't a rotation race and retrying won't help.
  const MAX_ATTEMPTS = 4;

  const attemptWithToken = (tokenValue: string | undefined, attemptsLeft: number): Cypress.Chainable<Cypress.Response<any>> =>
    send(tokenValue).then((response): Cypress.Chainable<Cypress.Response<any>> => {
      if (response.status !== 403 || attemptsLeft <= 1) {
        return cy.wrap(response, {log: false});
      }
      return cy.getCookie('XSRF-TOKEN').then((freshCookie): Cypress.Chainable<Cypress.Response<any>> => {
        if (!freshCookie || freshCookie.value === tokenValue) {
          return cy.wrap(response, {log: false});
        }
        return attemptWithToken(freshCookie.value, attemptsLeft - 1);
      });
    });

  return cy.getCookie('XSRF-TOKEN')
    .then(cookie => attemptWithToken(cookie?.value, MAX_ATTEMPTS))
    .then((response): Cypress.Chainable<Cypress.Response<any>> => {
      if (failOnStatusCode && (response.status < 200 || response.status >= 400)) {
        throw new Error(
          `cy.request() to ${options.method ?? 'GET'} ${options.url} failed with status ${response.status}: `
          + JSON.stringify(response.body)
        );
      }
      return cy.wrap(response, {log: false});
    });
});

Cypress.Commands.add('loginDefault', () => {
  const username = 'e2etest';
  const password = 'e2etest';

  cy.createLoginRequest(username, password);
});

Cypress.Commands.add('loginE2ETest2', () => {
  const username = 'e2etest2';
  const password = 'e2etest';

  cy.createLoginRequest(username, password);
});

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.createLoginRequest(username, password);
});

Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'POST',
    url: '/api/logout',
  });
});

Cypress.Commands.add(
  'createLoginRequest',
  (username: string, password: string, failOnStatusCode?: boolean): Cypress.Chainable<Cypress.Response<any>> => {
    const encodedCredentials = Buffer.from(username + ':' + password).toString('base64');

    return cy.request({
      method: 'POST',
      url: '/api/login',
      failOnStatusCode: failOnStatusCode,
      headers: {
        'Authorization': 'Basic ' + encodedCredentials
      }
    });
  }
);

Cypress.Commands.add('createDistribution', () => {
  cy.request({
    method: 'POST',
    url: '/api/distributions/new'
  });
});

Cypress.Commands.add('addCustomerToDistribution', (request: AddCustomerToDistributionRequest) => {
  cy.request({
    method: 'POST',
    url: '/api/distributions/households',
    // the backend identifies the customer by its household id (same number as before)
    body: {householdId: request.customerId, ticketNumber: request.ticketNumber}
  });
});

Cypress.Commands.add('closeDistribution', () => {
  // Runs from afterEach, including after a failed test that may not have gotten far enough to
  // leave the distribution in a state the statistics endpoint accepts. Tolerate that failure so
  // the actual close call below still runs - otherwise the distribution is left stuck open and
  // every later spec's createDistribution() fails with "Ausgabe bereits gestartet!".
  cy.request({
    method: 'POST',
    url: '/api/distributions/statistics',
    body: {employeeCount: 100, selectedShelterIds: [1, 2]},
    failOnStatusCode: false
  });

  cy.request({
    method: 'POST',
    url: '/api/distributions/close?forceClose=true'
  });
});

Cypress.Commands.add('accrueCostContributionDebt', (customerId: number) => {
  cy.createDistribution();
  cy.addCustomerToDistribution({customerId, ticketNumber: 1});

  // Marks the household's only ticket as "not paid" - the backend identifies it as the first
  // unprocessed ticket of the active distribution, no ticket number needed here.
  cy.request({
    method: 'POST',
    url: '/api/distributions/ticket-screen/show-next',
    body: {costContributionPaid: false}
  });

  cy.closeDistribution();

  // MissingCostContributionService only adds the debt once DistributionEndedEvent has been
  // processed asynchronously after the close request returns, so poll until it shows up.
  waitForPendingCostContributionAccrued(customerId);
});

function waitForPendingCostContributionAccrued(customerId: number, attemptsLeft = 20): void {
  cy.request('GET', `/api/households/${customerId}`).then((response) => {
    if ((response.body.pendingCostContribution ?? 0) > 0) {
      return;
    }
    if (attemptsLeft <= 1) {
      throw new Error(`Timed out waiting for household ${customerId} to accrue cost contribution debt`);
    }
    cy.wait(500);
    waitForPendingCostContributionAccrued(customerId, attemptsLeft - 1);
  });
}

Cypress.Commands.add(
  'createCustomer',
  // The backend speaks households/persons - translate in both directions here so the specs keep
  // working with the flat CustomerData shape (same split as in CustomerApiService).
  (data: CustomerData, force?: boolean): Cypress.Chainable<Cypress.Response<CustomerCreationResponse>> =>
    cy.request({
      method: 'POST',
      url: `/api/households?force=${force ?? false}`,
      body: customerToHousehold(data)
    }).then((response) => {
      response.body = {...response.body, data: householdToCustomer(response.body?.data)};
      return response as Cypress.Response<CustomerCreationResponse>;
    })
);

function customerToHousehold(data: CustomerData) {
  const mainPerson = {
    isMainPerson: true,
    firstname: data.firstname,
    lastname: data.lastname,
    birthDate: data.birthDate,
    gender: data.gender,
    country: data.country,
    employer: data.employer,
    income: data.income,
    incomeDue: data.incomeDue,
    excludeFromHousehold: false,
    receivesFamilyAllowance: false
  };
  const additionalPersons = (data.additionalPersons ?? []).map(person => ({
    id: person.id,
    isMainPerson: false,
    firstname: person.firstname,
    lastname: person.lastname,
    birthDate: person.birthDate,
    gender: person.gender,
    country: person.country,
    employer: person.employer,
    income: person.income,
    incomeDue: person.incomeDue,
    excludeFromHousehold: person.excludeFromHousehold,
    receivesFamilyAllowance: person.receivesFamilyAllowance
  }));

  return {
    id: data.id,
    address: data.address,
    telephoneNumber: data.telephoneNumber,
    email: data.email,
    validUntil: data.validUntil,
    locked: data.locked,
    lockReason: data.lockReason,
    persons: [mainPerson, ...additionalPersons]
  };
}

function householdToCustomer(household: any): CustomerData {
  const persons = household?.persons ?? [];
  const mainPerson = persons.find((person: any) => person.isMainPerson);

  return {
    ...household,
    firstname: mainPerson?.firstname,
    lastname: mainPerson?.lastname,
    birthDate: mainPerson?.birthDate,
    gender: mainPerson?.gender,
    country: mainPerson?.country,
    employer: mainPerson?.employer,
    income: mainPerson?.income,
    incomeDue: mainPerson?.incomeDue,
    additionalPersons: persons.filter((person: any) => !person.isMainPerson)
  };
}

Cypress.Commands.add(
  'createDummyCustomer',
  (income?: number, force?: boolean): Cypress.Chainable<Cypress.Response<CustomerCreationResponse>> =>
    cy.getAnyRandomNumber().then(randomNumber => {
      const data: CustomerData = {
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        telephoneNumber: '0123456789',
        email: 'firstname.lastname@test.com',
        employer: 'employer-' + randomNumber,
        country: {
          id: 165,
          code: 'AT',
          name: 'Österreich'
        },
        income: income ?? 1000,
        incomeDue: dayjs().add(30, 'days').toDate(),
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        },
        validUntil: dayjs().add(1, 'year').toDate()
      };
      return cy.createCustomer(data, force);
    })
);

Cypress.Commands.add(
  'createCustomerNote',
  (customerId: number, note: string): Cypress.Chainable<Cypress.Response<any>> =>
    cy.request({
      method: 'POST',
      url: `/api/households/${customerId}/notes`,
      body: {note: note}
    })
);

Cypress.Commands.add(
  'createUser',
  (data: UserData): Cypress.Chainable<Cypress.Response<UserData>> =>
    cy.request({
      method: 'POST',
      url: '/api/users',
      body: data
    })
);

Cypress.Commands.add(
  'createDummyUser',
  (): Cypress.Chainable<Cypress.Response<UserData>> =>
    cy.getAnyRandomNumber().then(randomNumber => {
      const data: UserData = {
        username: 'username-' + randomNumber,
        personnelNumber: randomNumber.toString(),
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: 'dummy-pwd-' + randomNumber,
        passwordChangeRequired: false,
        permissions: []
      };
      return cy.createUser(data);
    })
);

Cypress.Commands.add(
  'deleteUser',
  (userId: number): Cypress.Chainable<Cypress.Response<void>> =>
    cy.request({
      method: 'DELETE',
      url: '/api/users/' + userId
    })
);

Cypress.Commands.add('getRandomNumber', (min: number, max: number): Chainable<number> => {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return cy.wrap(Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil);
});

Cypress.Commands.add('getAnyRandomNumber', (): Chainable<number> => cy.getRandomNumber(50000, 100000));


export interface AddCustomerToDistributionRequest {
  customerId: number;
  ticketNumber: number;
}

export interface CountryData {
  id: number;
  code: string;
  name: string;
}

export interface CustomerCreationResponse {
  data: CustomerData;
  errorMsg: string;
}

export interface CustomerData {
  id?: number;
  issuer?: CustomerIssuer;
  issuedAt?: Date;
  firstname: string;
  lastname: string;
  birthDate: Date;
  gender: Gender;
  country?: CountryData;
  address: CustomerAddressData;
  telephoneNumber?: string;
  email?: string;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  validUntil?: Date;
  locked?: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  lockReason?: string;
  additionalPersons?: CustomerAddPersonData[];
}

export interface CustomerIssuer {
  personnelNumber: string;
  firstname: string;
  lastname: string;
}

export interface CustomerAddressData {
  street: string;
  houseNumber?: string;
  stairway?: string;
  door?: string;
  postalCode?: number;
  city?: string;
}

export interface CustomerAddPersonData {
  key: number;
  id: number;
  firstname: string;
  lastname: string;
  birthDate: Date;
  gender: Gender;
  country?: CountryData;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  excludeFromHousehold: boolean;
  receivesFamilyAllowance: boolean;
}

export interface UserData {
  id?: number;
  personnelNumber: string;
  username: string;
  firstname: string;
  lastname: string;
  enabled: boolean;
  password?: string;
  passwordRepeat?: string;
  passwordChangeRequired: boolean;
  permissions: UserPermission[];
}

export interface UserPermission {
  key: string;
  title: string;
  category?: string;
}

export enum Gender {
  MALE = 'MALE', FEMALE = 'FEMALE'
}
