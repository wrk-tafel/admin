import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {UserApiService} from './user-api.service';
import {provideHttpClient} from '@angular/common/http';
import {MailRecipients, MailTypeEnum, RecipientTypeEnum, SettingsApiService} from './settings-api.service';

describe('SettingsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: SettingsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
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

    const req = httpMock.expectOne({method: 'POST', url: '/settings/mail-recipients'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual(testData);
  });

});
