import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../common/http/suppress-error-toast.token';

@Service()
export class PendingDeletionsApiService {
  private readonly http = inject(HttpClient);

  /** The screen shows a failure inline, with a retry, so the generic error toast stays out of it. */
  getPendingDeletions(): Observable<PendingDeletionsResponse> {
    return this.http.get<PendingDeletionsResponse>('/settings/pending-deletions', {context: SUPPRESS_ERROR_TOAST_CONTEXT});
  }
}

/**
 * What the automatic retention jobs will delete soon. A list is `null` when the caller lacks the
 * permission for that kind of record (users: `USER_MANAGEMENT`, households: `CUSTOMER`,
 * employees: `SETTINGS`).
 */
export interface PendingDeletionsResponse {
  users: PendingUserDeletionListResponse | null;
  households: PendingHouseholdDeletionListResponse | null;
  employees: PendingEmployeeDeletionListResponse | null;
}

/**
 * The part every kind of list shares. `retentionText` and `warningText` are German dative text such
 * as "1 Jahr", "7 Jahren" or "30 Tagen", meant for sentences like "nach {retentionText} ohne
 * Anmeldung". `items` is capped by the backend (oldest first), `totalCount` counts all of them.
 */
export interface PendingDeletionListResponse<T> {
  /** `false` when the job is switched off - `items` is empty then. */
  enabled: boolean;
  retentionText: string;
  warningText: string;
  totalCount: number;
  items: T[];
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
