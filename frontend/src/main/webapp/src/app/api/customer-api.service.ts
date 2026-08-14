import {HttpClient, HttpContext, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {map, Observable} from 'rxjs';
import {CountryData} from './country-api.service';
import {tap} from 'rxjs/operators';
import {TafelToastrService} from '../common/components/tafel-toastr/tafel-toastr.service';
import {PagedResponse} from '../common/api/paged-response';

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

  createCustomer(data: CustomerData, force: boolean, context?: HttpContext): Observable<CustomerCreationResponse> {
    return this.http.post<HouseholdCreationResponse>('/households', mapCustomerToHousehold(data), {params: {force}, context})
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

  updateCustomer(data: CustomerData, force: boolean, context?: HttpContext): Observable<CustomerUpdateResponse> {
    return this.http.put<HouseholdUpdateResponse>(`/households/${data.id}`, mapCustomerToHousehold(data), {params: {force}, context})
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

  deleteCustomer(customerId: number, context?: HttpContext): Observable<void> {
    return this.http.delete<void>(`/households/${customerId}`, {context});
  }

  getCustomer(id: number, context?: HttpContext): Observable<CustomerData> {
    return this.http.get<HouseholdData>('/households/' + id, {context}).pipe(map(mapHouseholdToCustomer));
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
    searchInput?: string | null,
    postProcessing?: boolean | null,
    costContribution?: boolean | null,
    valid?: boolean | null,
    page?: number,
    pageSize?: number
  ): Observable<CustomerSearchResult> {
    let queryParams = new HttpParams();
    if (searchInput) {
      queryParams = queryParams.set('searchInput', searchInput);
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
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
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

  /**
   * Records that `householdId` and `otherHouseholdId` were reviewed and judged not to be a
   * duplicate, so {@link getCustomerDuplicates} stops surfacing that specific pair.
   */
  dismissDuplicate(householdId: number, otherHouseholdId: number): Observable<void> {
    return this.http.post<void>('/households/duplicates/dismiss', {householdId, otherHouseholdId});
  }

  getCustomersAboveLimit(
    page?: number, pageSize?: number, sortBy?: string, sortDirection?: string
  ): Observable<CustomerAboveLimitResponse> {
    return this.http.get<HouseholdAboveLimitResponse>('/households/above-limit', {
      params: this.aboveLimitParams(page, pageSize, sortBy, sortDirection)
    }).pipe(
      map(response => ({
        ...response,
        items: (response?.items ?? []).map(item => ({
          customer: mapHouseholdToCustomer(item.household),
          totalSum: item.totalSum,
          limit: item.limit,
          amountExceededLimit: item.amountExceededLimit,
          percentageExceededLimit: item.percentageExceededLimit
        }))
      }))
    );
  }

  generateCustomersAboveLimitCsv(sortBy?: string, sortDirection?: string): Observable<HttpResponse<Blob>> {
    return this.http.get('/households/above-limit/csv', {
      params: this.aboveLimitParams(undefined, undefined, sortBy, sortDirection),
      responseType: 'blob',
      observe: 'response'
    });
  }

  private aboveLimitParams(page?: number, pageSize?: number, sortBy?: string, sortDirection?: string): HttpParams {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    if (sortBy) {
      queryParams = queryParams.set('sortBy', sortBy);
    }
    if (sortDirection) {
      queryParams = queryParams.set('sortDirection', sortDirection);
    }
    return queryParams;
  }

  getCustomersOverview(distributionId?: number): Observable<CustomerOverviewResponse> {
    let queryParams = new HttpParams();
    if (distributionId) {
      queryParams = queryParams.set('distributionId', distributionId);
    }
    return this.http.get<HouseholdOverviewResponse>('/households/overview', {params: queryParams}).pipe(
      map(response => ({
        distributionId: response?.distributionId ?? null,
        distributionStartedAt: response?.distributionStartedAt,
        distributionEndedAt: response?.distributionEndedAt,
        newCustomers: (response?.newHouseholds ?? []).map(mapHouseholdOverviewItemToCustomer),
        renewedCustomers: (response?.renewedHouseholds ?? []).map(mapHouseholdOverviewItemToCustomer)
      }))
    );
  }

  generateCustomersOverviewCsv(distributionId?: number): Observable<HttpResponse<Blob>> {
    let queryParams = new HttpParams();
    if (distributionId) {
      queryParams = queryParams.set('distributionId', distributionId);
    }
    return this.http.get('/households/overview/generate-csv',
      {
        params: queryParams,
        responseType: 'blob',
        observe: 'response'
      });
  }

  getMergePreview(targetCustomerId: number, sourceCustomerIds: number[]): Observable<CustomerMergePreview> {
    let queryParams = new HttpParams();
    sourceCustomerIds.forEach(sourceCustomerId => {
      queryParams = queryParams.append('sourceHouseholdIds', sourceCustomerId);
    });

    return this.http.get<HouseholdMergePreviewResponse>(`/households/${targetCustomerId}/merge-preview`, {params: queryParams}).pipe(
      map(response => ({
        target: mapHouseholdToCustomer(response.target),
        sources: (response.sources ?? []).map(mapHouseholdToCustomer),
        fieldConflicts: (response.fieldConflicts ?? []).map(item => ({
          field: item.field,
          conflictingSourceCustomerIds: item.conflictingSourceHouseholdIds
        })),
        persons: (response.persons ?? []).map(item => ({
          sourceCustomerId: item.sourceHouseholdId,
          person: mapPersonToAddPersonData(item.person),
          duplicate: item.duplicate,
          matchedPersonId: item.matchedPersonId
        })),
        distributionCollisions: (response.distributionCollisions ?? []).map(item => ({
          distributionId: item.distributionId,
          distributionStartedAt: item.distributionStartedAt,
          sourceCustomerId: item.sourceHouseholdId,
          targetTicketNumber: item.targetTicketNumber,
          sourceTicketNumber: item.sourceTicketNumber
        })),
        noteCount: response.noteCount,
        documentCount: response.documentCount
      }))
    );
  }

  mergeCustomers(
    targetCustomerId: number,
    sourceCustomerIds: number[],
    fieldSelections: CustomerMergeFieldSelection[] = []
  ): Observable<CustomerMergeResult> {
    const body: HouseholdMergeRequest = {
      sourceHouseholdIds: sourceCustomerIds,
      fieldSelections: fieldSelections.map(selection => ({
        field: selection.field,
        sourceHouseholdId: selection.sourceCustomerId ?? null
      }))
    };
    return this.http.post<HouseholdMergeResponse>(`/households/${targetCustomerId}/merge`, body).pipe(
      map(response => ({
        target: mapHouseholdToCustomer(response.target),
        movedPersonCount: response.movedPersonCount,
        droppedDuplicatePersonCount: response.droppedDuplicatePersonCount,
        movedNoteCount: response.movedNoteCount,
        movedDocumentCount: response.movedDocumentCount,
        movedDistributionCount: response.movedDistributionCount,
        droppedDistributionCount: response.droppedDistributionCount,
        deletedCustomerIds: response.deletedHouseholdIds
      }))
    );
  }

  payCostContribution(householdId: number, amount?: number): Observable<CustomerData> {
    return this.http.post<HouseholdData>(`/households/${householdId}/cost-contribution/pay`, {amount})
      .pipe(map(mapHouseholdToCustomer));
  }

  editCostContribution(householdId: number, amount: number): Observable<CustomerData> {
    return this.http.put<HouseholdData>(`/households/${householdId}/cost-contribution`, {amount})
      .pipe(map(mapHouseholdToCustomer));
  }

}

export interface ValidateCustomerResponse {
  valid: boolean;
  totalSum: number;
  limit: number;
  toleranceValue: number;
  amountExceededLimit: number;
  details: IncomeCalculationDetails;
}

/**
 * What totalSum and limit are made up of, so the result dialog can show the calculation and not
 * just its outcome. totalSum is incomeSum + familyAllowanceSum + childTaxAllowanceSum +
 * siblingAdditionSum, limit is baseLimit + additionalAdultsSum + additionalChildrenSum +
 * toleranceValue.
 */
export interface IncomeCalculationDetails {
  incomeSum: number;
  familyAllowanceSum: number;
  childTaxAllowanceSum: number;
  siblingAdditionSum: number;
  baseLimit: number;
  baseLimitCountAdults: number;
  baseLimitCountChildren: number;
  additionalAdultsCount: number;
  additionalAdultsSum: number;
  additionalChildrenCount: number;
  additionalChildrenSum: number;
}

export type CustomerSearchResult = PagedResponse<CustomerData>;

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
  singleParent?: boolean;
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
  receivesFamilyAllowance: boolean;
}

export enum Gender {
  MALE = 'MALE', FEMALE = 'FEMALE'
}

export const genderLabel: { [key in Gender]: string } = {
  [Gender.FEMALE]: 'Weiblich',
  [Gender.MALE]: 'Männlich'
};

type PdfType = 'MASTERDATA' | 'IDCARD';

export type CustomerDuplicatesResponse = PagedResponse<CustomerDuplicatesItem>;

export interface CustomerDuplicatesItem {
  customer: CustomerData;
  similarCustomers: CustomerData[];
}

export type CustomerAboveLimitResponse = PagedResponse<CustomerAboveLimitItem>;

export interface CustomerAboveLimitItem {
  customer: CustomerData;
  totalSum: number;
  limit: number;
  amountExceededLimit: number;
  percentageExceededLimit: number;
}

export interface CustomerOverviewResponse {
  distributionId: number | null;
  distributionStartedAt?: Date;
  distributionEndedAt?: Date;
  newCustomers: CustomerOverviewItem[];
  renewedCustomers: CustomerOverviewItem[];
}

export interface CustomerOverviewItem {
  customer: CustomerData;
  date: Date;
}

export type CustomerMergeField =
  | 'ADDRESS'
  | 'TELEPHONE_NUMBER'
  | 'EMAIL'
  | 'VALID_UNTIL'
  | 'LOCK_STATE'
  | 'PENDING_COST_CONTRIBUTION'
  | 'SINGLE_PARENT'
  | 'MAIN_PERSON_FIRSTNAME'
  | 'MAIN_PERSON_LASTNAME'
  | 'MAIN_PERSON_BIRTHDATE'
  | 'MAIN_PERSON_GENDER'
  | 'MAIN_PERSON_COUNTRY'
  | 'MAIN_PERSON_EMPLOYER'
  | 'MAIN_PERSON_INCOME'
  | 'MAIN_PERSON_INCOME_DUE';

/** `sourceCustomerId` undefined/null means "keep the target's value". */
export interface CustomerMergeFieldSelection {
  field: CustomerMergeField;
  sourceCustomerId?: number | null;
}

export interface CustomerMergeFieldConflict {
  field: CustomerMergeField;
  conflictingSourceCustomerIds: number[];
}

export interface CustomerMergePersonEntry {
  sourceCustomerId: number;
  person: CustomerAddPersonData;
  duplicate: boolean;
  matchedPersonId?: number;
}

export interface CustomerMergeDistributionCollision {
  distributionId: number;
  distributionStartedAt?: Date;
  sourceCustomerId: number;
  targetTicketNumber?: number;
  sourceTicketNumber?: number;
}

export interface CustomerMergePreview {
  target: CustomerData;
  sources: CustomerData[];
  fieldConflicts: CustomerMergeFieldConflict[];
  persons: CustomerMergePersonEntry[];
  distributionCollisions: CustomerMergeDistributionCollision[];
  noteCount: number;
  documentCount: number;
}

export interface CustomerMergeResult {
  target: CustomerData;
  movedPersonCount: number;
  droppedDuplicatePersonCount: number;
  movedNoteCount: number;
  movedDocumentCount: number;
  movedDistributionCount: number;
  droppedDistributionCount: number;
  deletedCustomerIds: number[];
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
  singleParent?: boolean;
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
  receivesFamilyAllowance: boolean;
}

type HouseholdSearchResult = PagedResponse<HouseholdData>;

interface HouseholdCreationResponse {
  data: HouseholdData;
  errorMsg: string | null;
}

interface HouseholdUpdateResponse {
  data: HouseholdData;
  errorMsg: string | null;
}

type HouseholdDuplicatesResponse = PagedResponse<HouseholdDuplicatesItem>;

interface HouseholdDuplicatesItem {
  household: HouseholdData;
  similarHouseholds: HouseholdData[];
}

interface HouseholdMergeFieldSelectionItem {
  field: CustomerMergeField;
  sourceHouseholdId?: number | null;
}

interface HouseholdMergeRequest {
  sourceHouseholdIds: number[];
  fieldSelections?: HouseholdMergeFieldSelectionItem[];
}

interface HouseholdMergeFieldConflictItem {
  field: CustomerMergeField;
  conflictingSourceHouseholdIds: number[];
}

interface HouseholdMergePersonItem {
  sourceHouseholdId: number;
  person: PersonData;
  duplicate: boolean;
  matchedPersonId?: number;
}

interface HouseholdMergeDistributionCollisionItem {
  distributionId: number;
  distributionStartedAt?: Date;
  sourceHouseholdId: number;
  targetTicketNumber?: number;
  sourceTicketNumber?: number;
}

interface HouseholdMergePreviewResponse {
  target: HouseholdData;
  sources: HouseholdData[];
  fieldConflicts: HouseholdMergeFieldConflictItem[];
  persons: HouseholdMergePersonItem[];
  distributionCollisions: HouseholdMergeDistributionCollisionItem[];
  noteCount: number;
  documentCount: number;
}

interface HouseholdMergeResponse {
  target: HouseholdData;
  movedPersonCount: number;
  droppedDuplicatePersonCount: number;
  movedNoteCount: number;
  movedDocumentCount: number;
  movedDistributionCount: number;
  droppedDistributionCount: number;
  deletedHouseholdIds: number[];
}

type HouseholdAboveLimitResponse = PagedResponse<HouseholdAboveLimitItem>;

interface HouseholdAboveLimitItem {
  household: HouseholdData;
  totalSum: number;
  limit: number;
  amountExceededLimit: number;
  percentageExceededLimit: number;
}

interface HouseholdOverviewResponse {
  distributionId: number | null;
  distributionStartedAt?: Date;
  distributionEndedAt?: Date;
  newHouseholds: HouseholdOverviewItem[];
  renewedHouseholds: HouseholdOverviewItem[];
}

interface HouseholdOverviewItem {
  household: HouseholdData;
  date: Date;
}

/**
 * `key` is a form-only field and was never part of the server response either.
 */
function mapPersonToAddPersonData(person: PersonData): CustomerAddPersonData {
  return {
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
    receivesFamilyAllowance: person.receivesFamilyAllowance
  } as CustomerAddPersonData;
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
    .map(mapPersonToAddPersonData);

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
    singleParent: household?.singleParent,
    additionalPersons: additionalPersons
  };
}

function mapHouseholdOverviewItemToCustomer(item: HouseholdOverviewItem): CustomerOverviewItem {
  return {
    customer: mapHouseholdToCustomer(item.household),
    date: item.date
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
    receivesFamilyAllowance: false
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
    receivesFamilyAllowance: person.receivesFamilyAllowance
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
    singleParent: customer.singleParent,
    persons: [mainPerson, ...additionalPersons]
  };
}
