import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {MfaApiService} from './mfa-api.service';

describe('MfaApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: MfaApiService;

  const noContent = {status: 204, statusText: 'No Content'};

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(MfaApiService);
  });

  it('reads the status', () => {
    let status: unknown;
    apiService.getStatus().subscribe(response => status = response);

    const body = {totpEnabled: true, emailEnabled: false, required: true, emailAvailable: true};
    httpMock.expectOne({method: 'GET', url: '/mfa'}).flush(body);
    expect(status).toEqual(body);
    httpMock.verify();
  });

  it('starts the authenticator app setup', () => {
    let setup: unknown;
    apiService.setup().subscribe(response => setup = response);

    httpMock.expectOne({method: 'POST', url: '/mfa/setup'}).flush({secret: 'ABCD', otpauthUri: 'otpauth://totp/x'});
    expect(setup).toEqual({secret: 'ABCD', otpauthUri: 'otpauth://totp/x'});
    httpMock.verify();
  });

  it('hands the code in to enable the app, enable e-mail and verify a login', () => {
    apiService.enable('123456').subscribe();
    apiService.enableEmail('234567').subscribe();
    apiService.verify('345678').subscribe();

    const enable = httpMock.expectOne({method: 'POST', url: '/mfa/enable'});
    expect(enable.request.body).toEqual({code: '123456', currentCode: null, currentCredential: null});
    enable.flush(null, noContent);

    const enableEmail = httpMock.expectOne({method: 'POST', url: '/mfa/email/enable'});
    expect(enableEmail.request.body).toEqual({code: '234567', currentCode: null, currentCredential: null});
    enableEmail.flush(null, noContent);

    const verify = httpMock.expectOne({method: 'POST', url: '/mfa/verify'});
    expect(verify.request.body).toEqual({code: '345678'});
    verify.flush(null, noContent);
    httpMock.verify();
  });

  it('hands in proof of a method the user has already - a code or a passkey - when another one is switched on', () => {
    apiService.enable('123456', {code: '654321'}).subscribe();
    apiService.enableEmail('234567', {credential: {id: 'abc'}}).subscribe();

    expect(httpMock.expectOne({method: 'POST', url: '/mfa/enable'}).request.body)
      .toEqual({code: '123456', currentCode: '654321', currentCredential: null});
    expect(httpMock.expectOne({method: 'POST', url: '/mfa/email/enable'}).request.body)
      .toEqual({code: '234567', currentCode: null, currentCredential: {id: 'abc'}});
    httpMock.verify();
  });

  it('asks for the e-mail setup code and for a login code without a body', () => {
    apiService.setupEmail().subscribe();
    apiService.sendEmailCode().subscribe();

    httpMock.expectOne({method: 'POST', url: '/mfa/email/setup'}).flush(null, {status: 202, statusText: 'Accepted'});
    httpMock.expectOne({method: 'POST', url: '/mfa/email/send'}).flush(null, {status: 202, statusText: 'Accepted'});
    httpMock.verify();
  });

  it('names the method to switch off, and hands a code in', () => {
    apiService.disable('EMAIL', {code: '456789'}).subscribe();

    const disable = httpMock.expectOne({method: 'POST', url: '/mfa/disable'});
    expect(disable.request.body).toEqual({method: 'EMAIL', code: '456789', credential: null});
    disable.flush(null, noContent);
    httpMock.verify();
  });

  it('fetches the options for a new passkey and for a login with one', () => {
    let setup: unknown;
    let login: unknown;
    apiService.setupPasskey().subscribe(response => setup = response);
    apiService.passkeyOptions().subscribe(response => login = response);

    httpMock.expectOne({method: 'POST', url: '/mfa/passkey/setup'}).flush({options: {challenge: 'a'}});
    httpMock.expectOne({method: 'POST', url: '/mfa/passkey/options'}).flush({options: {challenge: 'b'}});
    expect(setup).toEqual({options: {challenge: 'a'}});
    expect(login).toEqual({options: {challenge: 'b'}});
    httpMock.verify();
  });

  it('hands the credential in to add a passkey and to complete a login, and proof to remove one', () => {
    const credential = {id: 'abc', type: 'public-key'};
    apiService.enablePasskey(credential, 'Laptop', {code: '123456'}).subscribe();
    apiService.verifyPasskey(credential).subscribe();
    apiService.disablePasskey(7, {credential}).subscribe();

    const enable = httpMock.expectOne({method: 'POST', url: '/mfa/passkey/enable'});
    expect(enable.request.body).toEqual({credential, name: 'Laptop', currentCode: '123456', currentCredential: null});
    enable.flush(null, noContent);

    const verify = httpMock.expectOne({method: 'POST', url: '/mfa/passkey/verify'});
    expect(verify.request.body).toEqual({credential});
    verify.flush(null, noContent);

    const disable = httpMock.expectOne({method: 'POST', url: '/mfa/passkey/7/disable'});
    expect(disable.request.body).toEqual({code: null, credential});
    disable.flush(null, noContent);
    httpMock.verify();
  });
});
