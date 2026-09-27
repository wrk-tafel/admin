import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../common/http/suppress-error-toast.token';

/**
 * What the automatic retention jobs will delete soon, one endpoint per kind of record so the three
 * lists page (and fail) independently. Each needs the permission of its own area
 * (`USER_MANAGEMENT`, `CUSTOMER`, `SETTINGS`) and answers 403 without it.
 *
 * The screen shows a failure inline, with a retry, so the generic error toast stays out of these.
 */
@Service()
export class PendingDeletionsApiService {
  private readonly http = inject(HttpClient);

  getPendingUserDeletions(page?: number, pageSize?: number): Observable<PendingUserDeletionListResponse> {
    return this.http.get<PendingUserDeletionListResponse>('/settings/pending-deletions/users', this.options(page, pageSize));
  }

  getPendingHouseholdDeletions(page?: number, pageSize?: number): Observable<PendingHouseholdDeletionListResponse> {
    return this.http.get<PendingHouseholdDeletionListResponse>('/settings/pending-deletions/households', this.options(page, pageSize));
  }

  getPendingEmployeeDeletions(page?: number, pageSize?: number): Observable<PendingEmployeeDeletionListResponse> {
    return this.http.get<PendingEmployeeDeletionListResponse>('/settings/pending-deletions/employees', this.options(page, pageSize));
  }

  private options(page?: number, pageSize?: number) {
    let params = new HttpParams();
    if (page) {
      params = params.set('page', page);
    }
    if (pageSize) {
      params = params.set('pageSize', pageSize);
    }
    return {params, context: SUPPRESS_ERROR_TOAST_CONTEXT};
  }
}

/**
 * One page of a list. `retentionText` and `warningText` are German dative text such as "1 Jahr",
 * "7 Jahren" or "30 Tagen", meant for sentences like "nach {retentionText} ohne Anmeldung".
 * `items` is ordered oldest activity first, `totalCount` counts all pages.
 */
export interface PendingDeletionListResponse<T> extends PagedResponse<T> {
  /** `false` when the job is switched off - `items` is empty then. */
  enabled: boolean;
  retentionText: string;
  warningText: string;
}

export type PendingUserDeletionListResponse = PendingDeletionListResponse<PendingUserDeletionItem>;
export type PendingHouseholdDeletionListResponse = PendingDeletionListResponse<PendingHouseholdDeletionItem>;
export type PendingEmployeeDeletionListResponse = PendingDeletionListResponse<PendingEmployeeDeletionItem>;

export interface PendingUserDeletionItem {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  personnelNumber: string;
  /** ISO datetime, `null` when the account never logged in (its age is then measured from `createdAt`). */
  lastLogin: string | null;
  createdAt: string;
  /** ISO date. */
  deletionDate: string;
}

export interface PendingHouseholdDeletionItem {
  /** The household's business number. */
  householdId: number;
  /** The main person as "Nachname Vorname". */
  name: string | null;
  /** ISO date. */
  validUntil: string;
  /** ISO date. */
  deletionDate: string;
}

export interface PendingEmployeeDeletionItem {
  id: number;
  personnelNumber: string;
  firstname: string;
  lastname: string;
  /** ISO datetime, `null` when never used as a driver (its age is then measured from `createdAt`). */
  lastUsed: string | null;
  createdAt: string;
  /** ISO date. */
  deletionDate: string;
}
