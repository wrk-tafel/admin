import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

@Service()
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getMailRecipients(): Observable<MailRecipients> {
    return this.http.get<MailRecipients>('/settings/mail-recipients');
  }

  saveMailRecipients(data: MailRecipients): Observable<void> {
    return this.http.put<void>('/settings/mail-recipients', data);
  }

  getStaticValues(): Observable<StaticValueListResponse> {
    return this.http.get<StaticValueListResponse>('/settings/static-values');
  }

  updateStaticValue(staticValueId: number, staticValue: StaticValueItem): Observable<StaticValueItem> {
    return this.http.put<StaticValueItem>(`/settings/static-values/${staticValueId}`, staticValue);
  }

  getLoginAttempts(page?: number, pageSize?: number): Observable<PagedResponse<LoginAttemptItem>> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<PagedResponse<LoginAttemptItem>>('/settings/login-attempts', {params: queryParams});
  }

  deleteLoginAttempt(loginAttemptId: number): Observable<void> {
    return this.http.delete<void>(`/settings/login-attempts/${loginAttemptId}`);
  }

}

export interface MailRecipients {
  mailRecipients: MailRecipientsPerMailType[];
}

export interface MailRecipientsPerMailType {
  mailType: MailTypeEnum;
  recipients: MailRecipient[];
}

export interface MailRecipient {
  recipientType: RecipientTypeEnum;
  addresses: string[];
}

export enum MailTypeEnum {
  DAILY_REPORT = 'DAILY_REPORT',
  STATISTICS = 'STATISTICS',
  RETURN_BOXES = 'RETURN_BOXES'
}

export enum RecipientTypeEnum {
  TO = 'TO',
  CC = 'CC',
  BCC = 'BCC'
}

export interface StaticValueListResponse {
  staticValues: StaticValueItem[];
}

export interface StaticValueItem {
  id: number | null;
  type: StaticValueTypeEnum;
  validFrom: string;
  validTo: string;
  amount: number | null;
  countAdults: number | null;
  countChildren: number | null;
  age: number | null;
}

export enum StaticValueTypeEnum {
  INCOME_LIMIT = 'INCOME_LIMIT',
  ADDITIONAL_ADULT = 'ADDITIONAL_ADULT',
  ADDITIONAL_CHILD = 'ADDITIONAL_CHILD',
  TOLERANCE = 'TOLERANCE',
  FAMILY_ALLOWANCE = 'FAMILY_ALLOWANCE',
  CHILD_TAX_ALLOWANCE = 'CHILD_TAX_ALLOWANCE',
  SIBLING_ADDITION = 'SIBLING_ADDITION',
  COST_CONTRIBUTION = 'COST_CONTRIBUTION'
}

export interface LoginAttemptItem {
  id: number;
  username: string;
  failureCount: number;
  lastFailureAt: string;
  lockedUntil: string | null;
}
