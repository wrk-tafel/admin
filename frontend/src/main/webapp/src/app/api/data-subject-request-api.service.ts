import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

/**
 * The central "Datenauskunft" screen (issue #3396): one search box across households, user
 * accounts and employees without one, then export or delete the matching record(s) - reusing the
 * household/user/employee export and delete flows those areas already own rather than a new export
 * format or a new deletion path.
 */
@Service()
export class DataSubjectRequestApiService {
  private readonly http = inject(HttpClient);

  search(searchInput: string): Observable<DataSubjectMatchListResponse> {
    const queryParams = new HttpParams().set('searchInput', searchInput);
    return this.http.get<DataSubjectMatchListResponse>('/data-subject-requests/search', {params: queryParams});
  }

  /** The GDPR Art. 15/20 combined data takeout - one ZIP even for a single selected match. */
  exportMatches(matches: DataSubjectMatch[]): Observable<HttpResponse<Blob>> {
    return this.http.post('/data-subject-requests/export', {matches}, {responseType: 'blob', observe: 'response'});
  }

  /** The GDPR Art. 17 erasure - one outcome per selected match, see DataSubjectDeleteResultItem. */
  deleteMatches(matches: DataSubjectMatch[]): Observable<DataSubjectDeleteResponse> {
    return this.http.post<DataSubjectDeleteResponse>('/data-subject-requests/delete', {matches});
  }
}

export type DataSubjectMatchType = 'CUSTOMER' | 'USER_ACCOUNT' | 'EMPLOYEE_WITHOUT_ACCOUNT';

export const dataSubjectMatchTypeLabel: Record<DataSubjectMatchType, string> = {
  CUSTOMER: 'Kunde',
  USER_ACCOUNT: 'Benutzerkonto',
  EMPLOYEE_WITHOUT_ACCOUNT: 'Mitarbeiter ohne Konto'
};

export interface DataSubjectMatchItem {
  type: DataSubjectMatchType;
  id: number;
  businessKey: string;
  name: string;
}

export interface DataSubjectMatchListResponse {
  items: DataSubjectMatchItem[];
  /** True when at least one area's own result was cut off at its per-area cap. */
  truncated: boolean;
}

export interface DataSubjectMatch {
  type: DataSubjectMatchType;
  id: number;
}

export type DataSubjectDeleteOutcome = 'DELETED' | 'NOT_FOUND';

export interface DataSubjectDeleteResultItem {
  match: DataSubjectMatch;
  outcome: DataSubjectDeleteOutcome;
}

export interface DataSubjectDeleteResponse {
  results: DataSubjectDeleteResultItem[];
}
