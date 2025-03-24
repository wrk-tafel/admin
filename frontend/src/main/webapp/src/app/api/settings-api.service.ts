import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getMailRecipients(): Observable<MailRecipients> {
    return this.http.get<MailRecipients>('/settings/mail-recipients');
  }

  saveMailRecipients(data: MailRecipients): Observable<void> {
    return this.http.post<void>('/settings/mail-recipients', data);
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
