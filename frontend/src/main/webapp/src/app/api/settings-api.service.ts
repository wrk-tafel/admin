import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getMailRecipients(): Observable<MailRecipients> {
    return this.http.get<MailRecipients>('/settings/mail-recipients');
  }

  saveMailRecipients(data: MailRecipients): Observable<void> {
    return this.http.post<void>('/settings/mail-recipients', data);
  }

  getStaticValues(): Observable<StaticValueListResponse> {
    return this.http.get<StaticValueListResponse>('/settings/static-values');
  }

  updateStaticValue(staticValueId: number, staticValue: StaticValueItem): Observable<StaticValueItem> {
    return this.http.post<StaticValueItem>(`/settings/static-values/${staticValueId}`, staticValue);
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
  COST_CONTRIBUTION = 'COST_CONTRIBUTION',
  SCHOOL_STARTER_PACKAGE_AGE_MIN = 'SCHOOL_STARTER_PACKAGE_AGE_MIN',
  SCHOOL_STARTER_PACKAGE_AGE_MAX = 'SCHOOL_STARTER_PACKAGE_AGE_MAX'
}
