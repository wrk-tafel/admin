import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {UserApiService} from './user-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {
  LoginAttemptListResponse,
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

  it('get login attempts', () => {
    const testResponse: LoginAttemptListResponse = {
      loginAttempts: [
        {id: 1, username: 'user1', failureCount: 3, lastFailureAt: '2026-01-01T10:00:00', lockedUntil: '2026-01-01T10:15:00'},
        {id: 2, username: 'user2', failureCount: 1, lastFailureAt: '2026-01-01T09:00:00', lockedUntil: null}
      ]
    };

    apiService.getLoginAttempts().subscribe((data: LoginAttemptListResponse) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/settings/login-attempts'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('delete login attempt', () => {
    apiService.deleteLoginAttempt(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/settings/login-attempts/1'});
    req.flush(null);
    httpMock.verify();
  });

});
