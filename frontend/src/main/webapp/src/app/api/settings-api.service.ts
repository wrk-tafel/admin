import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getMailRecipients(): Observable<MailRecipients> {
    return this.http.get<MailRecipients>('/settings/mail-recipients');
  }

  saveMailRecipients(data: MailRecipients): Observable<MailRecipients> {
    return this.http.put<MailRecipients>('/settings/mail-recipients', data);
  }

  deleteMailRecipient(id: number): Observable<void> {
    return this.http.delete<void>(`/settings/mail-recipients/${id}`);
  }

  getStaticValues(): Observable<StaticValueListResponse> {
    return this.http.get<StaticValueListResponse>('/settings/static-values');
  }

  /**
   * Applies [staticValue]'s amount from its `validFrom`: today or earlier means now, a later day plans
   * it. The id of a planned amount changes that plan.
   */
  updateStaticValue(staticValueId: number, staticValue: StaticValueRequest): Observable<StaticValueItem> {
    return this.http.put<StaticValueItem>(`/settings/static-values/${staticValueId}`, staticValue);
  }

  /** Removes an amount planned for a later date; the current one then stays valid beyond it. */
  deleteStaticValue(staticValueId: number): Observable<void> {
    return this.http.delete<void>(`/settings/static-values/${staticValueId}`);
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
  addresses: MailRecipientAddressItem[];
}

export interface MailRecipientAddressItem {
  id: number | null;
  address: string;
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
  /** The amount already planned to replace this one from a later date, if any. */
  scheduled?: ScheduledStaticValue | null;
}

export interface ScheduledStaticValue {
  id: number;
  /** `yyyy-MM-dd` */
  validFrom: string;
  amount: number;
}

export type StaticValueRequest = Omit<StaticValueItem, 'scheduled'>;

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
