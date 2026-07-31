import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {UserApiService} from './user-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {
  MailRecipients,
  MailTypeEnum,
  RecipientTypeEnum,
  SettingsApiService,
  StaticValueItem,
  StaticValueTypeEnum
} from './settings-api.service';

describe('SettingsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: SettingsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        UserApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(SettingsApiService);
  });

  it('get mail recipients', () => {
    apiService.getMailRecipients().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/settings/mail-recipients'});
    req.flush(null);
    httpMock.verify();
  });

  it('save mail recipients', () => {
    const testData: MailRecipients = {
      mailRecipients: [
        {
          mailType: MailTypeEnum.DAILY_REPORT,
          recipients: [
            {
              recipientType: RecipientTypeEnum.TO,
              addresses: ['to1@test.com']
            }
          ]
        },
        {
          mailType: MailTypeEnum.STATISTICS,
          recipients: [
            {
              recipientType: RecipientTypeEnum.BCC,
              addresses: ['bcc1@test.com']
            }
          ]
        }
      ]
    };

    apiService.saveMailRecipients(testData).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/settings/mail-recipients'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual(testData);
  });

  it('get static values', () => {
    apiService.getStaticValues().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/settings/static-values'});
    req.flush(null);
    httpMock.verify();
  });

  it('update static value', () => {
    const testData: StaticValueItem = {
      id: 1,
      type: StaticValueTypeEnum.TOLERANCE,
      validFrom: '2026-01-01',
      validTo: '2999-12-31',
      amount: 150,
      countAdults: null,
      countChildren: null,
      age: null
    };

    apiService.updateStaticValue(1, testData).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/settings/static-values/1'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual(testData);
  });

});
