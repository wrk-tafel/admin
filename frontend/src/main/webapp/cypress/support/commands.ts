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
// A *query* (not a command wrapping cy.wrap): a command freezes the element set it resolved once,
// so a re-render between the query and a later click leaves the click retrying a detached node
// until it times out ("the page updated while this command was executing"). As a query the whole
// chain re-runs on every retry and picks up the re-rendered element instead.
// Guarded: specs importing this module's exported types/values (e.g. `Gender`) execute it a second
// time in their own bundle, which `Commands.add` tolerates by overwriting but `addQuery` rejects.
if (!(Cypress as unknown as Record<string, boolean>)['tafelFilterDisplayedRegistered']) {
  (Cypress as unknown as Record<string, boolean>)['tafelFilterDisplayedRegistered'] = true;
  Cypress.Commands.addQuery('filterDisplayed', function () {
    return (subject: JQuery) => subject.filter((_, el) => (el as HTMLElement).offsetParent !== null);
  });
}

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
  // the retries rather than assuming a single retry always lands on a stable value. The value read
  // back can be identical to the one just sent and still be the one that gets through, so an
  // unchanged cookie is deliberately not a reason to stop retrying (see #3101). A 403 means the
  // request never reached its controller, so repeating it has no side effect. Two calls opt out of
  // the retry because for them a 403 is the expected answer rather than a race: /api/login, which
  // is CSRF-exempt and whose failed attempts the lockout tests count, and any call that passes its
  // own X-XSRF-TOKEN header (general.cy.ts sends a deliberately mismatching one).
  //
  // Each recursive call must return a *bare* command from the `cy.getCookie().then()` callback
  // that invokes it, with the response handling living in a separate, sibling `.then()` rather
  // than being folded into the recursion itself - returning a value that already has its own
  // `.then()` chained onto it, from within an outer `.then()` callback here, makes Cypress lose
  // track of the command queue and throw "returned a promise from a command while also invoking
  // one or more cy commands in that promise" even on the plain non-retry path.
  const MAX_ATTEMPTS = 4;
  const callerSuppliedToken = Object.keys(options.headers ?? {}).some(header => header.toLowerCase() === 'x-xsrf-token');
  const retryable = !callerSuppliedToken && !(options.url ?? '').toString().includes('/api/login');

  const requestWithRetry = (attemptsLeft: number): Cypress.Chainable<Cypress.Response<any>> =>
    cy.getCookie('XSRF-TOKEN')
      .then(cookie => send(cookie?.value))
      .then((response): Cypress.Chainable<Cypress.Response<any>> => {
        if (response.status !== 403 || attemptsLeft <= 1 || !retryable) {
          return cy.wrap(response, {log: false});
        }
        return cy.getCookie('XSRF-TOKEN').then((freshCookie): Cypress.Chainable<Cypress.Response<any>> => {
          if (!freshCookie) {
            return cy.wrap(response, {log: false});
          }
          return requestWithRetry(attemptsLeft - 1);
        });
      });

  return requestWithRetry(MAX_ATTEMPTS)
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

  // The close endpoint answers 200 either way: an actual close returns an empty body, while a
  // refused one returns the DistributionCloseResponse validation result - forceClose overrides
  // warnings only, never hard errors. Without checking the body, a refused close looks like a
  // success here and the distribution stays open, so the failure only surfaces much later as
  // "Ausgabe bereits gestartet!" in whichever spec runs next.
  cy.request({
    method: 'POST',
    url: '/api/distributions/close?forceClose=true'
  }).then((response) => {
    const validationResult = response.body as { errors?: string[], warnings?: string[] } | '';
    if (validationResult) {
      const reasons = [...(validationResult.errors ?? []), ...(validationResult.warnings ?? [])];
      throw new Error(`Closing the distribution was refused: ${reasons.join(', ')}`);
    }
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
  //
  // Defaults force=true: these commands exist to set up baseline test data reliably, not to probe
  // the create/update conflict paths (income limit, duplicate detection) - those are exercised
  // through the real UI flow elsewhere. Without this, two unrelated specs' randomly-generated
  // dummy customers can trip the fuzzy duplicate check (soundex ignores the numeric suffix that's
  // otherwise the only difference between them) and fail with an unexpected 409. A spec that
  // specifically wants to see a conflict passes force: false explicitly.
  (data: CustomerData, force?: boolean): Cypress.Chainable<Cypress.Response<CustomerCreationResponse>> =>
    cy.request({
      method: 'POST',
      url: `/api/households?force=${force ?? true}`,
      body: customerToHousehold(data)
    }).then((response) => {
      response.body = {...response.body, data: householdToCustomer(response.body?.data)};
      return response as Cypress.Response<CustomerCreationResponse>;
    })
);

Cypress.Commands.add(
  'updateCustomer',
  // See createCustomer above for why force defaults to true here too.
  (data: CustomerData, force?: boolean): Cypress.Chainable<Cypress.Response<CustomerCreationResponse>> =>
    cy.request({
      method: 'PUT',
      url: `/api/households/${data.id}?force=${force ?? true}`,
      body: customerToHousehold(data)
    }).then((response) => {
      response.body = {...response.body, data: householdToCustomer(response.body?.data)};
      return response as Cypress.Response<CustomerCreationResponse>;
    })
);

// The backend's birthDate/incomeDue/validUntil are LocalDate (date-only). Sending a Date object
// straight into a cy.request() JSON body serializes it via Date.prototype.toJSON(), which is
// always UTC - in a timezone ahead of UTC that shifts a local calendar date to the previous day.
// Formatting in local time here keeps the sent date identical to what the UI would type in.
function toLocalDateString(date?: Date): string | undefined {
  return date ? dayjs(date).format('YYYY-MM-DD') : undefined;
}

function customerToHousehold(data: CustomerData) {
  const mainPerson = {
    isMainPerson: true,
    firstname: data.firstname,
    lastname: data.lastname,
    birthDate: toLocalDateString(data.birthDate),
    gender: data.gender,
    country: data.country,
    employer: data.employer,
    income: data.income,
    incomeDue: toLocalDateString(data.incomeDue),
    excludeFromHousehold: false,
    receivesFamilyAllowance: false
  };
  const additionalPersons = (data.additionalPersons ?? []).map(person => ({
    id: person.id,
    isMainPerson: false,
    firstname: person.firstname,
    lastname: person.lastname,
    birthDate: toLocalDateString(person.birthDate),
    gender: person.gender,
    country: person.country,
    employer: person.employer,
    income: person.income,
    incomeDue: toLocalDateString(person.incomeDue),
    excludeFromHousehold: person.excludeFromHousehold,
    receivesFamilyAllowance: person.receivesFamilyAllowance
  }));

  return {
    id: data.id,
    address: data.address,
    telephoneNumber: data.telephoneNumber,
    email: data.email,
    validUntil: toLocalDateString(data.validUntil),
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
        password: testUserPassword(randomNumber),
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

Cypress.Commands.add('getAnyRandomNumber', (): Chainable<number> =>
  // Timestamp (mod 1e8, i.e. ~27.7h) + a random suffix keeps the result unique across every spec
  // in an e2e run (which takes minutes, not hours) while staying short enough for narrow columns
  // like license_plate (varchar(20)) that get it appended to a fixed prefix.
  cy.getRandomNumber(0, 999).then(randomSuffix => (Date.now() % 100_000_000) * 1000 + randomSuffix)
);


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

/**
 * Password for a user an e2e spec creates, derived from its getAnyRandomNumber() so it stays
 * unique. Every digit is mapped to a letter a-j: that number carries a timestamp and periodically
 * spells one of the substrings the backend's password validator rejects ("1030", see
 * WebSecurityConfig.passwordValidator), which used to fail user creation for whole seconds out of
 * every ~27.7h cycle. None of the blocked words can be spelled with a-j alone, so what comes out
 * of here is always accepted. The prefix is only worth overriding for a spec that needs a specific
 * kind of password (e.g. one with an umlaut in it, see login.cy.ts).
 *
 * The fixed 'X9' suffix is what satisfies the validator's character-class rule (needs an uppercase
 * letter, a lowercase letter and a digit) - the randomised part above stays letters-only for the
 * banned-substring reason above, so it alone never has an uppercase letter or a digit. Fixed rather
 * than derived from the random number so it never needs the same digit-avoidance treatment.
 */
export const testUserPassword = (randomNumber: number, prefix = 'dummy-'): string =>
  prefix + randomNumber.toString().replace(/\d/g, digit => 'abcdefghij'[Number(digit)]) + 'X9';

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
