import type {MockedObject} from 'vitest';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {LoginMfaComponent} from './login-mfa.component';
import {AuthenticationService} from '../../security/authentication.service';
import {MfaApiService} from '../../../api/mfa-api.service';

describe('LoginMfaComponent', () => {
  let mfaApiService: MockedObject<MfaApiService>;
  let methods: ReturnType<typeof signal<string[]>>;
  let authService: {
    userInfo: ReturnType<typeof signal>;
    passwordChangeRequired: ReturnType<typeof signal<boolean>>;
    loadUserInfo: ReturnType<typeof vi.fn>;
    isMfaPending: ReturnType<typeof vi.fn>;
    mfaMethods: ReturnType<typeof vi.fn>;
    redirectToLogin: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: {navigate: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    methods = signal(['TOTP']);
    authService = {
      userInfo: signal({username: 'max', permissions: [], mfaPending: true}),
      passwordChangeRequired: signal(false),
      loadUserInfo: vi.fn().mockResolvedValue({username: 'max', permissions: ['X']}),
      isMfaPending: vi.fn().mockReturnValue(true),
      mfaMethods: vi.fn(() => methods()),
      redirectToLogin: vi.fn(),
      logout: vi.fn().mockReturnValue(of(undefined))
    };
    router = {navigate: vi.fn().mockResolvedValue(true)};

    TestBed.configureTestingModule({
      providers: [
        {provide: AuthenticationService, useValue: authService},
        {provide: Router, useValue: router},
        {
          provide: MfaApiService,
          useValue: {
            verify: vi.fn().mockName('MfaApiService.verify').mockReturnValue(of(undefined)),
            sendEmailCode: vi.fn().mockName('MfaApiService.sendEmailCode').mockReturnValue(of(undefined))
          }
        }
      ]
    });
    mfaApiService = TestBed.inject(MfaApiService) as MockedObject<MfaApiService>;
  });

  async function create() {
    const fixture = TestBed.createComponent(LoginMfaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = Awaited<ReturnType<typeof create>>;

  function type(fixture: Fixture, code: string) {
    fixture.componentInstance.codeForm.code().value.set(code);
    fixture.detectChanges();
  }

  const text = (fixture: Fixture, testid: string): string | undefined =>
    fixture.nativeElement.querySelector(`[testid="${testid}"]`)?.textContent?.trim();

  const element = (fixture: Fixture, testid: string) => fixture.nativeElement.querySelector(`[testid="${testid}"]`);

  it('shows the code form to a login that still owes its code', async () => {
    const fixture = await create();

    expect(element(fixture, 'mfaCode')).not.toBeNull();
    expect(text(fixture, 'mfaHint')).toContain('Authenticator-App');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(authService.redirectToLogin).not.toHaveBeenCalled();
  });

  it('sends someone who is not logged in to the login page', async () => {
    authService.userInfo.set(null);
    authService.loadUserInfo.mockResolvedValue(null);

    await create();

    expect(authService.redirectToLogin).toHaveBeenCalled();
  });

  it('sends someone who owes no code on to the overview', async () => {
    authService.isMfaPending.mockReturnValue(false);

    await create();

    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('does not send a code that is empty or not six digits', async () => {
    const fixture = await create();

    fixture.componentInstance.onSubmit(new Event('submit'));
    type(fixture, '12345');
    fixture.componentInstance.onSubmit(new Event('submit'));
    type(fixture, '12345a');
    fixture.componentInstance.onSubmit(new Event('submit'));

    expect(mfaApiService.verify).not.toHaveBeenCalled();
    expect(fixture.componentInstance.codeForm.code().errors().map(error => error.kind)).toEqual(['codeFormat']);
  });

  it('sends the code without the space an app shows in the middle, then goes on to the overview', async () => {
    const fixture = await create();
    type(fixture, '123 456');

    fixture.componentInstance.onSubmit(new Event('submit'));
    await fixture.whenStable();

    expect(mfaApiService.verify).toHaveBeenCalledWith('123456', expect.anything());
    expect(authService.loadUserInfo).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('goes on to the password change when one is due', async () => {
    authService.passwordChangeRequired.set(true);
    const fixture = await create();
    type(fixture, '123456');

    fixture.componentInstance.onSubmit(new Event('submit'));
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/login/passwortaendern']);
  });

  it('shows why the code was refused, empties the field and stays on the page', async () => {
    const fixture = await create();
    mfaApiService.verify.mockReturnValue(throwError(() => ({
      status: 400,
      error: {detail: 'Der Code ist ungültig, oder es gab zu viele Fehlversuche - bitte später erneut versuchen!'}
    })));
    type(fixture, '123456');

    fixture.componentInstance.onSubmit(new Event('submit'));
    fixture.detectChanges();

    expect(text(fixture, 'errorMessage')).toContain('Der Code ist ungültig');
    expect(fixture.componentInstance.codeForm.code().value()).toBe('');
    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('says so on a rate limit', async () => {
    const fixture = await create();
    mfaApiService.verify.mockReturnValue(throwError(() => ({status: 429})));
    type(fixture, '123456');

    fixture.componentInstance.onSubmit(new Event('submit'));
    fixture.detectChanges();

    expect(text(fixture, 'errorMessage')).toContain('Zu viele Anfragen');
  });

  it('logs out for real when the user backs out', async () => {
    const fixture = await create();

    fixture.componentInstance.cancel();

    expect(authService.logout).toHaveBeenCalled();
  });

  describe('with the e-mail method', () => {

    it('offers to send the code when the user has both methods, without sending it', async () => {
      methods.set(['TOTP', 'EMAIL']);

      const fixture = await create();

      expect(element(fixture, 'sendEmailCodeButton')).not.toBeNull();
      expect(text(fixture, 'mfaHint')).toContain('per E-Mail senden');
      expect(mfaApiService.sendEmailCode).not.toHaveBeenCalled();
    });

    it('does not offer it to a user who has only the app', async () => {
      const fixture = await create();

      expect(element(fixture, 'sendEmailCodeButton')).toBeNull();
    });

    it('sends the code as the page opens when e-mail is the only method', async () => {
      methods.set(['EMAIL']);

      const fixture = await create();

      expect(mfaApiService.sendEmailCode).toHaveBeenCalledTimes(1);
      expect(text(fixture, 'infoMessage')).toContain('Ein Code wurde an Ihre E-Mail-Adresse gesendet');
      expect(text(fixture, 'mfaHint')).toContain('an Ihre E-Mail-Adresse gesendet wurde');
    });

    it('sends the code when asked, and says so', async () => {
      methods.set(['TOTP', 'EMAIL']);
      const fixture = await create();

      fixture.componentInstance.sendEmailCode();
      fixture.detectChanges();

      expect(mfaApiService.sendEmailCode).toHaveBeenCalledTimes(1);
      expect(text(fixture, 'infoMessage')).toContain('gesendet');
    });

    it('treats a cooldown refusal on the automatic send as "already sent", not as an error', async () => {
      methods.set(['EMAIL']);
      mfaApiService.sendEmailCode.mockReturnValue(throwError(() => ({status: 429})));

      const fixture = await create();

      expect(text(fixture, 'errorMessage')).toBeUndefined();
      expect(text(fixture, 'infoMessage')).toContain('bereits gesendet');
    });

    it('shows a cooldown refusal of a send the user asked for, and any other failure', async () => {
      methods.set(['TOTP', 'EMAIL']);
      const fixture = await create();

      mfaApiService.sendEmailCode.mockReturnValue(throwError(() => ({status: 429})));
      fixture.componentInstance.sendEmailCode();
      fixture.detectChanges();
      expect(text(fixture, 'errorMessage')).toContain('einen Moment warten');

      mfaApiService.sendEmailCode.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Kein Mailversand'}})));
      fixture.componentInstance.sendEmailCode();
      fixture.detectChanges();
      expect(text(fixture, 'errorMessage')).toBe('Kein Mailversand');
      expect(fixture.componentInstance.sendingCode()).toBe(false);
    });
  });
});
