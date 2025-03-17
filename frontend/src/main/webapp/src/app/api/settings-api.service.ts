import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getMailRecipients(): Observable<MailRecipientSettingsResponse> {
    return this.http.get<MailRecipientSettingsResponse>('/settings/mail-recipients');
  }

}

export interface MailRecipientSettingsResponse {
  settings: MailRecipientSetting[];
}

export interface MailRecipientSetting {
  mailType: MailType;
  recipients: MailRecipient[];
}

export interface MailRecipient {
  type: RecipientTypeEnum;
  recipient: string;
}

export enum MailTypeEnum {
  DAILY_REPORT = "DAILY_REPORT",
  STATISTICS = "STATISTICS",
  RETURN_BOXES = "RETURN_BOXES"
}

export enum RecipientTypeEnum {
  To = "TO",
  Cc = "CC",
  Bcc = "BCC"
}

export interface MailType {
  type: MailTypeEnum;
  label: string;
}

export const MailTypes: MailType[] = [
  {type: MailTypeEnum.DAILY_REPORT, label: "Tagesreport"},
  {type: MailTypeEnum.STATISTICS, label: "Statistiken"},
  {type: MailTypeEnum.RETURN_BOXES, label: "Retourkisten"}
];
