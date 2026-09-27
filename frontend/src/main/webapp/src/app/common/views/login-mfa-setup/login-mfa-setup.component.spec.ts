import type {MockedObject} from 'vitest';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {LoginMfaSetupComponent} from './login-mfa-setup.component';
import {AuthenticationService} from '../../security/authentication.service';
import {MfaApiService, MfaStatus} from '../../../api/mfa-api.service';
import {UserAccountData, UserApiService} from '../../../api/user-api.service';

describe('LoginMfaSetupComponent', () => {
  let mfaApiService: MockedObject<MfaApiService>;
  let userApiService: MockedObject<UserApiService>;
  let authService: {
    userInfo: ReturnType<typeof signal>;
    passwordChangeRequired: ReturnType<typeof signal<boolean>>;
    loadUserInfo: ReturnType<typeof vi.fn>;
    isMfaPending: ReturnType<typeof vi.fn>;
    isMfaSetupRequired: ReturnType<typeof vi.fn>;
    redirectToLogin: ReturnType<typeof vi.fn>;
    redirectToMfa: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: {navigate: ReturnType<typeof vi.fn>};

  const setup = {secret: 'ABCDEFGHJKLMNPQR', otpauthUri: 'otpauth://totp/Tafel:max?secret=ABCDEFGHJKLMNPQR&issuer=Tafel'};
  const status = (overrides: Partial<MfaStatus> = {}): MfaStatus => ({
    totpEnabled: false, emailEnabled: false, required: true, emailAvailable: true, emailAddress: 'max@example.org', ...overrides
  });
  const account = (overrides: Partial<UserAccountData> = {}): UserAccountData => ({
    username: 'max', personnelNumber: '42', firstname: 'Max', lastname: 'Mustermann',
    email: 'max@example.org', mfaEmailEnabled: false, ...overrides
  });

  beforeEach(() => {
    router = {navigate: vi.fn().mockResolvedValue(true)};
    authService = {
      userInfo: signal({username: 'max', permissions: [], mfaSetupRequired: true}),
      passwordChangeRequired: signal(false),
      loadUserInfo: vi.fn().mockResolvedValue({username: 'max', permissions: ['X']}),
      isMfaPending: vi.fn().mockReturnValue(false),
      isMfaSetupRequired: vi.fn().mockReturnValue(true),
      redirectToLogin: vi.fn(),
      redirectToMfa: vi.fn(),
      logout: vi.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: AuthenticationService, useValue: authService},
        {provide: Router, useValue: router},
        {
          provide: MfaApiService,
          useValue: {
            getStatus: vi.fn().mockName('MfaApiService.getStatus').mockReturnValue(of(status())),
            setup: vi.fn().mockName('MfaApiService.setup').mockReturnValue(of(setup)),
            enable: vi.fn().mockName('MfaApiService.enable').mockReturnValue(of(undefined)),
            setupEmail: vi.fn().mockName('MfaApiService.setupEmail').mockReturnValue(of(undefined)),
            enableEmail: vi.fn().mockName('MfaApiService.enableEmail').mockReturnValue(of(undefined))
          }
        },
        {
          provide: UserApiService,
          useValue: {
            getAccount: vi.fn().mockName('UserApiService.getAccount').mockReturnValue(of(account())),
            updateAccount: vi.fn().mockName('UserApiService.updateAccount').mockReturnValue(of(account()))
          }
        }
      ]
    });
    mfaApiService = TestBed.inject(MfaApiService) as MockedObject<MfaApiService>;
    userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
  });

  async function create() {
    const fixture = TestBed.createComponent(LoginMfaSetupComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = Awaited<ReturnType<typeof create>>;

  const element = (fixture: Fixture, testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[testid="${testid}"]`);
  const text = (fixture: Fixture, testid: string) => element(fixture, testid)?.textContent?.trim();

  function type(fixture: Fixture, field: 'appCode' | 'emailCode', code: string) {
    fixture.componentInstance.codeForm[field]().value.set(code);
    fixture.detectChanges();
  }

  async function settle(fixture: Fixture) {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('sends someone who is not logged in to the login page', async () => {
    authService.userInfo.set(null);
    authService.loadUserInfo.mockResolvedValue(null);

    const fixture = await create();

    expect(authService.redirectToLogin).toHaveBeenCalled();
    expect(element(fixture, 'mfaForcedBanner')).toBeNull();
  });

  it('sends a login that still owes its code to the code page instead', async () => {
    authService.isMfaPending.mockReturnValue(true);

    const fixture = await create();

    expect(authService.redirectToMfa).toHaveBeenCalled();
    expect(element(fixture, 'mfaForcedBanner')).toBeNull();
  });

  it('sends someone who does not need a setup on to the overview', async () => {
    authService.isMfaSetupRequired.mockReturnValue(false);

    const fixture = await create();

    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
    expect(element(fixture, 'mfaForcedBanner')).toBeNull();
  });

  it('offers to set both methods up while none is on and an address is already present', async () => {
    const fixture = await create();

    expect(text(fixture, 'mfaForcedBanner')).toContain('verlangt eine Zwei-Faktor-Authentifizierung. Bitte');
    expect(element(fixture, 'mfaSetupButton')).not.toBeNull();
    expect(element(fixture, 'mfaEmailSetupButton')).not.toBeNull();
    expect(element(fixture, 'mfaEmailAddressInput')).toBeNull();
    expect(element(fixture, 'mfaAppRecommended')).not.toBeNull();
  });

  it('shows the secret in groups and draws a QR code once the app setup is started', async () => {
    const fixture = await create();

    fixture.componentInstance.startAppSetup();
    await settle(fixture);

    expect(text(fixture, 'mfaSecret')).toBe('ABCD EFGH JKLM NPQR');
    expect(element(fixture, 'mfaQrCode')!.querySelector('svg')).not.toBeNull();
  });

  it('switches the app on with a valid code and continues to the overview once nothing else is owed', async () => {
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123 456');
    // the app was the only gap (the address is already on record) - the fresh session now clears it
    authService.isMfaSetupRequired.mockReturnValue(false);

    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(mfaApiService.enable).toHaveBeenCalledWith('123456', null, expect.anything());
    expect(authService.loadUserInfo).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('re-renders for the address step instead of continuing when the app was not the only gap', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailAddress: null})));
    userApiService.getAccount.mockReturnValue(of(account({email: null})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123456');
    // the address is still missing - the fresh session still owes something, just not a method any more
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, emailAddress: null})));

    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(element(fixture, 'mfaEmailAddressInput')).not.toBeNull();
    expect(element(fixture, 'mfaSetupButton')).toBeNull();
  });

  it('goes on to the password change when one is due', async () => {
    authService.passwordChangeRequired.set(true);
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123456');
    authService.isMfaSetupRequired.mockReturnValue(false);

    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(router.navigate).toHaveBeenCalledWith(['/login/passwortaendern']);
  });

  it('shows why an app code was refused and stays on the page', async () => {
    mfaApiService.enable.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Der Code ist ungültig'}})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123456');

    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sets up the e-mail method when an address is already on record', async () => {
    const fixture = await create();

    fixture.componentInstance.startEmailSetup();
    await settle(fixture);
    expect(mfaApiService.setupEmail).toHaveBeenCalled();
    expect(text(fixture, 'infoMessage')).toContain('gesendet');

    type(fixture, 'emailCode', '654321');
    authService.isMfaSetupRequired.mockReturnValue(false);
    fixture.componentInstance.enableEmail(new Event('submit'));
    await settle(fixture);

    expect(mfaApiService.enableEmail).toHaveBeenCalledWith('654321', null, expect.anything());
    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  // ADR-0062: the address is now its own, unconditional step - shown ahead of the method chooser, not
  // reached only by first picking the e-mail method.
  describe('the e-mail address step', () => {

    it('shows the address form alongside the method chooser, but keeps the e-mail method unavailable until it is saved', async () => {
      userApiService.getAccount.mockReturnValue(of(account({email: null})));
      mfaApiService.getStatus.mockReturnValue(of(status({emailAddress: null})));

      const fixture = await create();

      expect(text(fixture, 'mfaForcedBanner')).toContain('mindestens eine Methode ein und tragen Sie eine E-Mail-Adresse');
      expect(text(fixture, 'mfaEmailAddressHint')).toContain('keine E-Mail-Adresse hinterlegt');
      expect(element(fixture, 'mfaEmailAddressInput')).not.toBeNull();
      // the app needs no address, so it is offered right away - the e-mail method does need one, so it is not
      expect(element(fixture, 'mfaSetupButton')).not.toBeNull();
      expect(element(fixture, 'mfaEmailSetupButton')).toBeNull();
      expect(text(fixture, 'mfaEmailNoAddress')).toContain('Tragen Sie oben zuerst eine E-Mail-Adresse ein');
    });

    it('saves the address without starting the e-mail method, then shows the method chooser', async () => {
      userApiService.getAccount.mockReturnValue(of(account({email: null})));
      mfaApiService.getStatus.mockReturnValue(of(status({emailAddress: null})));
      userApiService.updateAccount.mockReturnValue(of(account({email: 'new@example.org'})));
      const fixture = await create();

      // the reload afterStepCompleted triggers sees the address as saved, and no method yet
      userApiService.getAccount.mockReturnValue(of(account({email: 'new@example.org'})));
      mfaApiService.getStatus.mockReturnValue(of(status({emailAddress: 'new@example.org'})));

      fixture.componentInstance.emailAddressForm.email().value.set('new@example.org');
      fixture.detectChanges();
      fixture.componentInstance.saveEmailAddress(new Event('submit'));
      await settle(fixture);

      expect(userApiService.updateAccount).toHaveBeenCalledWith(
        {firstname: 'Max', lastname: 'Mustermann', email: 'new@example.org'},
        expect.anything()
      );
      expect(mfaApiService.setupEmail).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(element(fixture, 'mfaEmailAddressInput')).toBeNull();
      expect(element(fixture, 'mfaSetupButton')).not.toBeNull();
    });

    it('does not save an empty or malformed e-mail address', async () => {
      userApiService.getAccount.mockReturnValue(of(account({email: null})));
      mfaApiService.getStatus.mockReturnValue(of(status({emailAddress: null})));
      const fixture = await create();

      fixture.componentInstance.saveEmailAddress(new Event('submit'));
      expect(userApiService.updateAccount).not.toHaveBeenCalled();
      expect(fixture.componentInstance.emailAddressForm.email().errors().map(error => error.kind)).toEqual(['required']);

      fixture.componentInstance.emailAddressForm.email().value.set('not-an-email');
      fixture.detectChanges();
      fixture.componentInstance.saveEmailAddress(new Event('submit'));
      expect(userApiService.updateAccount).not.toHaveBeenCalled();
      expect(fixture.componentInstance.emailAddressForm.email().errors().map(error => error.kind)).toEqual(['email']);
    });

    it('shows only the address step for a user who already has a method but no address', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, emailAddress: null})));
      userApiService.getAccount.mockReturnValue(of(account({email: null})));

      const fixture = await create();

      expect(text(fixture, 'mfaForcedBanner')).toContain('verlangt eine hinterlegte E-Mail-Adresse für jedes Benutzerkonto');
      expect(element(fixture, 'mfaEmailAddressInput')).not.toBeNull();
      expect(element(fixture, 'mfaSetupButton')).toBeNull();
      expect(element(fixture, 'mfaEmailSetupButton')).toBeNull();
    });

    it('completes the login once the address was the only remaining gap', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, emailAddress: null})));
      userApiService.getAccount.mockReturnValue(of(account({email: null})));
      userApiService.updateAccount.mockReturnValue(of(account({email: 'new@example.org'})));
      const fixture = await create();
      authService.isMfaSetupRequired.mockReturnValue(false);

      fixture.componentInstance.emailAddressForm.email().value.set('new@example.org');
      fixture.detectChanges();
      fixture.componentInstance.saveEmailAddress(new Event('submit'));
      await settle(fixture);

      expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
      expect(mfaApiService.setupEmail).not.toHaveBeenCalled();
    });
  });

  it('says that e-mail is not available where no mail can be sent', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailAvailable: false})));

    const fixture = await create();

    expect(text(fixture, 'mfaEmailUnavailable')).toContain('kein E-Mail-Versand');
    expect(element(fixture, 'mfaEmailSetupButton')).toBeNull();
  });

  it('logs out for real when the user backs out', async () => {
    const fixture = await create();

    fixture.componentInstance.cancel();

    expect(authService.logout).toHaveBeenCalled();
  });
});
