import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {UserApiService} from './user-api.service';
import {provideHttpClient} from '@angular/common/http';
import {SettingsApiService} from './settings-api.service';

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

});
