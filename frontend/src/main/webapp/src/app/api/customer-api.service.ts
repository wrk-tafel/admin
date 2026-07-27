import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {map, Observable} from 'rxjs';
import {CountryData} from './country-api.service';
import {tap} from 'rxjs/operators';
import {TafelToastrService} from '../common/components/tafel-toastr/tafel-toastr.service';

/**
 * The backend stores a customer as a *household* plus a list of *persons*, one of which is flagged
 * as the main person. The rest of this application still works with the flat {@link CustomerData}
 * shape (main person's fields on the customer itself plus an `additionalPersons` array), so this
 * service is the single place that translates between the two representations - see
 * {@link mapHouseholdToCustomer} / {@link mapCustomerToHousehold}.
 */
@Service()
export class CustomerApiService {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(TafelToastrService);

  validate(data: CustomerData): Observable<ValidateCustomerResponse> {
    return this.http.post<ValidateCustomerResponse>('/households/validate', mapCustomerToHousehold(data));
  }

  createCustomer(data: CustomerData, force: boolean): Observable<CustomerCreationResponse> {
    return this.http.post<HouseholdCreationResponse>('/households', mapCustomerToHousehold(data), {params: {force}})
      .pipe(
        map(response => ({data: mapHouseholdToCustomer(response?.data), errorMsg: response?.errorMsg ?? null})),
        tap(response => {
          const errorMsg = response.errorMsg;
          if (errorMsg) {
            this.toastr.error(errorMsg);
          }
        })
      );
  }

  updateCustomer(data: CustomerData, force: boolean): Observable<CustomerUpdateResponse> {
    return this.http.post<HouseholdUpdateResponse>(`/households/${data.id}`, mapCustomerToHousehold(data), {params: {force}})
      .pipe(
        map(response => ({data: mapHouseholdToCustomer(response?.data), errorMsg: response?.errorMsg ?? null})),
        tap(response => {
          const errorMsg = response.errorMsg;
          if (errorMsg) {
            this.toastr.error(errorMsg);
          }
        })
      );
  }

  deleteCustomer(customerId: number): Observable<void> {
    return this.http.delete<void>(`/households/${customerId}`);
  }

  getCustomer(id: number): Observable<CustomerData> {
    return this.http.get<HouseholdData>('/households/' + id).pipe(map(mapHouseholdToCustomer));
  }

  generatePdf(id: number, type: PdfType): Observable<HttpResponse<Blob>> {
    let queryParams = new HttpParams();
    queryParams = queryParams.append('type', type);

    return this.http.get('/households/' + id + '/generate-pdf',
      {
        params: queryParams,
        responseType: 'blob',
        observe: 'response'
      });
  }

  searchCustomer(
    lastname?: string | null,
    firstname?: string | null,
    postProcessing?: boolean | null,
    costContribution?: boolean | null,
    valid?: boolean | null,
    page?: number
  ): Observable<CustomerSearchResult> {
    let queryParams = new HttpParams();
    if (lastname) {
      queryParams = queryParams.set('lastname', lastname);
    }
    if (firstname) {
      queryParams = queryParams.set('firstname', firstname);
    }
    if (postProcessing) {
      queryParams = queryParams.set('postProcessing', postProcessing);
    }
    if (costContribution) {
      queryParams = queryParams.set('costContribution', costContribution);
    }
    if (valid) {
      queryParams = queryParams.set('valid', valid);
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<HouseholdSearchResult>('/households', {params: queryParams}).pipe(
      map(response => ({...response, items: (response?.items ?? []).map(mapHouseholdToCustomer)}))
    );
  }

  getCustomerDuplicates(page?: number): Observable<CustomerDuplicatesResponse> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<HouseholdDuplicatesResponse>('/households/duplicates', {params: queryParams}).pipe(
      map(response => ({
        ...response,
        items: (response?.items ?? []).map(item => ({
          customer: mapHouseholdToCustomer(item.household),
          similarCustomers: (item.similarHouseholds ?? []).map(mapHouseholdToCustomer)
        }))
      }))
    );
  }

  getCustomersAboveLimit(): Observable<CustomerAboveLimitItem[]> {
    return this.http.get<HouseholdAboveLimitResponse>('/households/above-limit').pipe(
      map(response => (response?.items ?? []).map(item => ({
        customer: mapHouseholdToCustomer(item.household),
        totalSum: item.totalSum,
        limit: item.limit,
        amountExceededLimit: item.amountExceededLimit
      })))
    );
  }

  mergeCustomers(targetCustomerId: number, sourceCustomerIds: number[]): Observable<void> {
    const request: CustomerMergeRequest = {sourceCustomerIds: sourceCustomerIds};
    const body: HouseholdMergeRequest = {sourceHouseholdIds: request.sourceCustomerIds};
    return this.http.post<void>(`/households/${targetCustomerId}/merge`, body);
  }

}

export interface ValidateCustomerResponse {
  valid: boolean;
  totalSum: number;
  limit: number;
  toleranceValue: number;
  amountExceededLimit: number;
}

export interface CustomerSearchResult {
  items: CustomerData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface CustomerCreationResponse {
  data: CustomerData;
  errorMsg: string | null;
}

export interface CustomerUpdateResponse {
  data: CustomerData;
  errorMsg: string | null;
}

export interface CustomerData {
  id?: number;
  issuer?: CustomerIssuer;
  issuedAt?: Date;
  firstname?: string;
  lastname?: string;
  birthDate?: Date;
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
  lockedBy?: string | null;
  lockReason?: string | null;
  pendingCostContribution?: number;
  additionalPersons?: CustomerAddPersonData[];
}

export interface CustomerIssuer {
  personnelNumber: string;
  firstname: string;
  lastname: string;
}

export interface CustomerAddressData {
  street?: string;
  houseNumber?: string;
  stairway?: string;
  door?: string;
  postalCode?: number;
  city?: string;
}

export interface CustomerAddPersonData {
  key: string | number;
  id: number;
  firstname: string;
  lastname: string;
  birthDate?: Date;
  gender?: Gender;
  country?: CountryData;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  excludeFromHousehold: boolean;
  receivesFamilyBonus: boolean;
}

export enum Gender {
  MALE = 'MALE', FEMALE = 'FEMALE'
}

export const genderLabel: { [key in Gender]: string } = {
  [Gender.FEMALE]: 'Weiblich',
  [Gender.MALE]: 'Männlich'
};

type PdfType = 'MASTERDATA' | 'IDCARD' | 'COMBINED';

export interface CustomerDuplicatesResponse {
  items: CustomerDuplicatesItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface CustomerDuplicatesItem {
  customer: CustomerData;
  similarCustomers: CustomerData[];
}

export interface CustomerAboveLimitItem {
  customer: CustomerData;
  totalSum: number;
  limit: number;
  amountExceededLimit: number;
}

export interface CustomerMergeRequest {
  sourceCustomerIds: number[];
}

// ---------------------------------------------------------------------------
// Backend wire format
//
// Everything below mirrors the backend's households/persons model and is
// intentionally NOT exported: no component, view or resolver should ever see it.
// ---------------------------------------------------------------------------

interface HouseholdData {
  id?: number;
  issuer?: CustomerIssuer;
  issuedAt?: Date;
  address: CustomerAddressData;
  telephoneNumber?: string;
  email?: string;
  validUntil?: Date;
  locked?: boolean;
  lockedAt?: Date;
  lockedBy?: string | null;
  lockReason?: string | null;
  pendingCostContribution?: number;
  persons: PersonData[];
}

interface PersonData {
  id?: number;
  isMainPerson: boolean;
  firstname?: string;
  lastname?: string;
  birthDate?: Date;
  gender?: Gender;
  country?: CountryData;
  employer?: string;
  income?: number;
  incomeDue?: Date;
  excludeFromHousehold: boolean;
  receivesFamilyBonus: boolean;
}

interface HouseholdSearchResult {
  items: HouseholdData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

interface HouseholdCreationResponse {
  data: HouseholdData;
  errorMsg: string | null;
}

interface HouseholdUpdateResponse {
  data: HouseholdData;
  errorMsg: string | null;
}

interface HouseholdDuplicatesResponse {
  items: HouseholdDuplicatesItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

interface HouseholdDuplicatesItem {
  household: HouseholdData;
  similarHouseholds: HouseholdData[];
}

interface HouseholdMergeRequest {
  sourceHouseholdIds: number[];
}

interface HouseholdAboveLimitResponse {
  items: HouseholdAboveLimitItem[];
}

interface HouseholdAboveLimitItem {
  household: HouseholdData;
  totalSum: number;
  limit: number;
  amountExceededLimit: number;
}

/**
 * Backend -> frontend: flattens the household's main person onto the customer and exposes the
 * remaining household members as `additionalPersons`.
 */
function mapHouseholdToCustomer(household: HouseholdData | null | undefined): CustomerData {
  const persons = household?.persons ?? [];
  const mainPerson = persons.find(person => person.isMainPerson);

  const additionalPersons = persons
    .filter(person => !person.isMainPerson)
    .map(person => ({
      // `key` is a form-only field and was never part of the server response before either
      id: person.id,
      firstname: person.firstname,
      lastname: person.lastname,
      birthDate: person.birthDate,
      gender: person.gender,
      country: person.country,
      employer: person.employer,
      income: person.income,
      incomeDue: person.incomeDue,
      excludeFromHousehold: person.excludeFromHousehold,
      receivesFamilyBonus: person.receivesFamilyBonus
    }) as CustomerAddPersonData);

  return {
    id: household?.id,
    issuer: household?.issuer,
    issuedAt: household?.issuedAt,
    firstname: mainPerson?.firstname,
    lastname: mainPerson?.lastname,
    birthDate: mainPerson?.birthDate,
    gender: mainPerson?.gender as Gender,
    country: mainPerson?.country,
    address: household?.address as CustomerAddressData,
    telephoneNumber: household?.telephoneNumber,
    email: household?.email,
    employer: mainPerson?.employer,
    income: mainPerson?.income,
    incomeDue: mainPerson?.incomeDue,
    validUntil: household?.validUntil,
    locked: household?.locked,
    lockedAt: household?.lockedAt,
    lockedBy: household?.lockedBy,
    lockReason: household?.lockReason,
    pendingCostContribution: household?.pendingCostContribution,
    additionalPersons: additionalPersons
  };
}

/**
 * Frontend -> backend: turns the flat main-person fields into the household's main person and
 * appends the additional persons, so the request carries a single `persons` list.
 *
 * The main person's own `persons[]` id is not round-tripped (the flat CustomerData has nowhere to
 * keep it); the backend resolves it from the stored household instead, so the existing row is
 * updated rather than replaced.
 */
function mapCustomerToHousehold(customer: CustomerData): HouseholdData {
  const mainPerson: PersonData = {
    isMainPerson: true,
    firstname: customer.firstname,
    lastname: customer.lastname,
    birthDate: customer.birthDate,
    gender: customer.gender,
    country: customer.country,
    employer: customer.employer,
    income: customer.income,
    incomeDue: customer.incomeDue,
    excludeFromHousehold: false,
    receivesFamilyBonus: false
  };

  const additionalPersons: PersonData[] = (customer.additionalPersons ?? []).map(person => ({
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
    receivesFamilyBonus: person.receivesFamilyBonus
  }));

  return {
    id: customer.id,
    issuer: customer.issuer,
    issuedAt: customer.issuedAt,
    address: customer.address,
    telephoneNumber: customer.telephoneNumber,
    email: customer.email,
    validUntil: customer.validUntil,
    locked: customer.locked,
    lockedAt: customer.lockedAt,
    lockedBy: customer.lockedBy,
    lockReason: customer.lockReason,
    pendingCostContribution: customer.pendingCostContribution,
    persons: [mainPerson, ...additionalPersons]
  };
}
