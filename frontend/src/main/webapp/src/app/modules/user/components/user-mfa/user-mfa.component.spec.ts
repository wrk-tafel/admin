import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {EMPTY, of, throwError} from 'rxjs';
import {UserMfaComponent} from './user-mfa.component';
import {HttpErrorResponse} from '@angular/common/http';
import {MfaApiService, MfaStatus} from '../../../../api/mfa-api.service';
import {PasskeyService} from '../../../../common/security/passkey.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserMfaComponent', () => {
  let mfaApiService: MockedObject<MfaApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let router: {
    navigate: ReturnType<typeof vi.fn>;
    createUrlTree: ReturnType<typeof vi.fn>;
    serializeUrl: ReturnType<typeof vi.fn>;
    events: typeof EMPTY;
  };
  let authenticationService: {loadUserInfo: ReturnType<typeof vi.fn>};

  const setup = {secret: 'ABCDEFGHJKLMNPQR', otpauthUri: 'otpauth://totp/Tafel:max?secret=ABCDEFGHJKLMNPQR&issuer=Tafel'};
  const status = (overrides: Partial<MfaStatus> = {}): MfaStatus => ({
    totpEnabled: false, emailEnabled: false, required: false, emailAvailable: true, emailAddress: 'max@example.org', ...overrides
  });

  beforeEach(() => {
    router = {
      navigate: vi.fn().mockResolvedValue(true),
      // the pointer to the "Meine Daten" tab is a RouterLink, which builds its href from these two
      createUrlTree: vi.fn().mockReturnValue({}),
      serializeUrl: vi.fn().mockReturnValue('/konto/daten'),
      events: EMPTY
    };
    authenticationService = {loadUserInfo: vi.fn().mockResolvedValue({username: 'max', permissions: ['X']})};

    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: router},
        {provide: ActivatedRoute, useValue: {}},
        {provide: AuthenticationService, useValue: authenticationService},
        // a browser without passkeys unless a test says otherwise
        {provide: PasskeyService, useValue: {isSupported: vi.fn().mockReturnValue(false), create: vi.fn(), get: vi.fn()}},
        {
          provide: MfaApiService,
          useValue: {
            getStatus: vi.fn().mockName('MfaApiService.getStatus').mockReturnValue(of(status())),
            setup: vi.fn().mockName('MfaApiService.setup').mockReturnValue(of(setup)),
            enable: vi.fn().mockName('MfaApiService.enable').mockReturnValue(of(undefined)),
            setupEmail: vi.fn().mockName('MfaApiService.setupEmail').mockReturnValue(of(undefined)),
            enableEmail: vi.fn().mockName('MfaApiService.enableEmail').mockReturnValue(of(undefined)),
            sendEmailCode: vi.fn().mockName('MfaApiService.sendEmailCode').mockReturnValue(of(undefined)),
            disable: vi.fn().mockName('MfaApiService.disable').mockReturnValue(of(undefined))
          }
        },
        {
          provide: TafelToastrService,
          useValue: {success: vi.fn(), error: vi.fn()}
        }
      ]
    });
    mfaApiService = TestBed.inject(MfaApiService) as MockedObject<MfaApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  async function create() {
    const fixture = TestBed.createComponent(UserMfaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = Awaited<ReturnType<typeof create>>;

  const element = (fixture: Fixture, testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[testid="${testid}"]`);
  const text = (fixture: Fixture, testid: string) => element(fixture, testid)?.textContent?.trim();

  function type(fixture: Fixture, field: 'appCode' | 'emailCode' | 'disableCode' | 'appCurrentCode' | 'emailCurrentCode', code: string) {
    fixture.componentInstance.codeForm[field]().value.set(code);
    fixture.detectChanges();
  }

  async function settle(fixture: Fixture) {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ---- authenticator app

  it('offers to set both methods up while none is on', async () => {
    const fixture = await create();

    expect(text(fixture, 'mfaTotpStatus')).toBe('Nicht aktiv');
    expect(text(fixture, 'mfaEmailStatus')).toBe('Nicht aktiv');
    expect(element(fixture, 'mfaSetupButton')).not.toBeNull();
    expect(element(fixture, 'mfaEmailSetupButton')).not.toBeNull();
    expect(element(fixture, 'mfaDisableCode')).toBeNull();
  });

  it('shows the secret in groups and draws a QR code for it once the app setup is started', async () => {
    const fixture = await create();

    fixture.componentInstance.startAppSetup();
    fixture.detectChanges();

    expect(text(fixture, 'mfaTotpStatus')).toBe('Wird eingerichtet');
    expect(text(fixture, 'mfaSecret')).toBe('ABCD EFGH JKLM NPQR');
    const svg = element(fixture, 'mfaQrCode')!.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toContain('QR-Code');
  });

  it('links to the app stores while the app setup is going on, and nowhere else', async () => {
    const fixture = await create();
    expect(element(fixture, 'mfaStoreLinkGoogle')).toBeNull();

    fixture.componentInstance.startAppSetup();
    fixture.detectChanges();

    const google = element(fixture, 'mfaStoreLinkGoogle') as HTMLAnchorElement;
    const apple = element(fixture, 'mfaStoreLinkApple') as HTMLAnchorElement;
    expect(google.href).toContain('https://play.google.com/store/apps/details');
    expect(apple.href).toContain('https://apps.apple.com/');
    for (const link of [google, apple]) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
    }
  });

  it('can back out of the app setup without having switched anything on', async () => {
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    fixture.detectChanges();

    fixture.componentInstance.cancelAppSetup();
    fixture.detectChanges();

    expect(element(fixture, 'mfaSetupButton')).not.toBeNull();
    expect(mfaApiService.enable).not.toHaveBeenCalled();
  });

  it('does not send an app code that is empty or not six digits', async () => {
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    fixture.detectChanges();

    fixture.componentInstance.enableApp(new Event('submit'));
    type(fixture, 'appCode', '12345');
    fixture.componentInstance.enableApp(new Event('submit'));

    expect(mfaApiService.enable).not.toHaveBeenCalled();
  });

  it('switches the app on with a valid code and reads the status and the session again', async () => {
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123 456');
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));

    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(mfaApiService.enable).toHaveBeenCalledWith('123456', null, expect.anything());
    expect(authenticationService.loadUserInfo).toHaveBeenCalled();
    expect(text(fixture, 'mfaTotpStatus')).toBe('Aktiv');
    expect(toastr.success).toHaveBeenCalledWith('Authenticator-App eingerichtet!');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows why an app code was refused and stays in the setup', async () => {
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    mfaApiService.enable.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Der Code ist ungültig'}})));
    type(fixture, 'appCode', '123456');

    await fixture.componentInstance.enableApp(new Event('submit'));
    fixture.detectChanges();

    expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
    expect(text(fixture, 'mfaTotpStatus')).toBe('Wird eingerichtet');
    expect(fixture.componentInstance.working()).toBe(false);
  });

  // A session that was left open must not be able to put its own second factor next to the user's.
  it('asks a user who has the e-mail method for a code of it before adding the app', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    fixture.detectChanges();
    expect(element(fixture, 'mfaAppCurrentCode')).not.toBeNull();
    type(fixture, 'appCode', '123456');

    // no current code yet
    fixture.componentInstance.enableApp(new Event('submit'));
    expect(mfaApiService.enable).not.toHaveBeenCalled();

    type(fixture, 'appCode', '123456');
    type(fixture, 'appCurrentCode', '654 321');
    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(mfaApiService.enable).toHaveBeenCalledWith('123456', {code: '654321'}, expect.anything());
  });

  it('lets the current code for adding the app be sent by e-mail, when that is the method the user has', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    fixture.detectChanges();

    (element(fixture, 'mfaAppSendCurrentCodeButton') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(mfaApiService.sendEmailCode).toHaveBeenCalled();
    expect(text(fixture, 'infoMessage')).toContain('gesendet');
  });

  it('asks a user who has the app for a code of it before adding the e-mail method, and offers no e-mail button for it', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
    const fixture = await create();
    fixture.componentInstance.startEmailSetup();
    fixture.detectChanges();
    expect(element(fixture, 'mfaEmailCurrentCode')).not.toBeNull();
    expect(element(fixture, 'mfaEmailSendCurrentCodeButton')).toBeNull();

    type(fixture, 'emailCode', '654321');
    fixture.componentInstance.enableEmail(new Event('submit'));
    expect(mfaApiService.enableEmail).not.toHaveBeenCalled();

    type(fixture, 'emailCode', '654321');
    type(fixture, 'emailCurrentCode', '123456');
    fixture.componentInstance.enableEmail(new Event('submit'));
    await settle(fixture);

    expect(mfaApiService.enableEmail).toHaveBeenCalledWith('654321', {code: '123456'}, expect.anything());
  });

  // ---- e-mail

  it('sends a code when the e-mail setup is started, and switches the method on with it', async () => {
    const fixture = await create();

    fixture.componentInstance.startEmailSetup();
    fixture.detectChanges();

    expect(mfaApiService.setupEmail).toHaveBeenCalled();
    expect(text(fixture, 'mfaEmailStatus')).toBe('Wird eingerichtet');
    expect(text(fixture, 'infoMessage')).toContain('gesendet');

    type(fixture, 'emailCode', '654321');
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));
    fixture.componentInstance.enableEmail(new Event('submit'));
    await settle(fixture);

    expect(mfaApiService.enableEmail).toHaveBeenCalledWith('654321', null, expect.anything());
    expect(text(fixture, 'mfaEmailStatus')).toBe('Aktiv');
    expect(toastr.success).toHaveBeenCalledWith('Code per E-Mail eingerichtet!');
  });

  it('can send the setup code again, or back out', async () => {
    const fixture = await create();
    fixture.componentInstance.startEmailSetup();
    fixture.detectChanges();

    (element(fixture, 'mfaEmailResendButton') as HTMLButtonElement).click();
    expect(mfaApiService.setupEmail).toHaveBeenCalledTimes(2);

    fixture.componentInstance.cancelEmailSetup();
    fixture.detectChanges();
    expect(element(fixture, 'mfaEmailSetupButton')).not.toBeNull();
  });

  it('says so when a new code is asked for too soon', async () => {
    const fixture = await create();
    mfaApiService.setupEmail.mockReturnValue(throwError(() => ({status: 429})));

    fixture.componentInstance.startEmailSetup();
    fixture.detectChanges();

    expect(text(fixture, 'errorMessage')).toContain('einen Moment warten');
  });

  it('names the address a code goes to, and where to change it', async () => {
    const fixture = await create();

    expect(text(fixture, 'mfaEmailAddress')).toContain('max@example.org');
    expect(element(fixture, 'mfaEmailAddress')!.querySelector('a')!.textContent).toContain('Meine Daten');
    expect(element(fixture, 'mfaEmailSetupButton')).not.toBeNull();
  });

  it('sends a user with no address to the "Meine Daten" tab instead of offering the e-mail method', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailAddress: null})));

    const fixture = await create();

    expect(text(fixture, 'mfaEmailStatus')).toBe('Nicht aktiv');
    expect(text(fixture, 'mfaEmailNoAddress')).toContain('keine E-Mail-Adresse hinterlegt');
    expect(element(fixture, 'mfaEmailNoAddress')!.querySelector('a')!.textContent).toContain('Meine Daten');
    expect(element(fixture, 'mfaEmailSetupButton')).toBeNull();
  });

  it('says that e-mail is not available where no mail can be sent', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailAvailable: false})));

    const fixture = await create();

    expect(text(fixture, 'mfaEmailUnavailable')).toContain('kein E-Mail-Versand');
    expect(element(fixture, 'mfaEmailSetupButton')).toBeNull();
  });

  // ---- switching off

  it('switches the app off with a code, naming the method', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
    const fixture = await create();
    expect(text(fixture, 'mfaTotpStatus')).toBe('Aktiv');
    expect(element(fixture, 'mfaSendDisableCodeButton')).toBeNull();
    type(fixture, 'disableCode', '654321');
    mfaApiService.getStatus.mockReturnValue(of(status()));

    fixture.componentInstance.disable('TOTP');
    await settle(fixture);

    expect(mfaApiService.disable).toHaveBeenCalledWith('TOTP', {code: '654321'}, expect.anything());
    expect(text(fixture, 'mfaTotpStatus')).toBe('Nicht aktiv');
    expect(toastr.success).toHaveBeenCalledWith('Authenticator-App entfernt!');
  });

  it('lets someone with the e-mail method have a code sent to switch it off', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));
    const fixture = await create();

    (element(fixture, 'mfaSendDisableCodeButton') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(mfaApiService.sendEmailCode).toHaveBeenCalled();
    expect(text(fixture, 'infoMessage')).toContain('gesendet');
  });

  it('stays on when the code for switching off is refused', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, emailEnabled: true})));
    mfaApiService.disable.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Der Code ist ungültig'}})));
    const fixture = await create();
    type(fixture, 'disableCode', '654321');

    await fixture.componentInstance.disable('EMAIL');
    fixture.detectChanges();

    expect(text(fixture, 'mfaEmailStatus')).toBe('Aktiv');
    expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
  });

  // ---- the deployment requires it

  it('does not let the last method be switched off while the deployment requires one', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({required: true, totpEnabled: true})));

    const fixture = await create();

    expect(text(fixture, 'mfaRequiredHint')).toContain('Eine Methode muss immer eingerichtet bleiben');
    expect(text(fixture, 'mfaLastMethodHint')).toContain('kann nicht ausgeschaltet werden');
    expect((element(fixture, 'mfaDisableTotpButton') as HTMLButtonElement).disabled).toBe(true);
  });

  it('lets one of two methods be switched off while the deployment requires one', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({required: true, totpEnabled: true, emailEnabled: true})));

    const fixture = await create();

    expect(element(fixture, 'mfaLastMethodHint')).toBeNull();
    expect((element(fixture, 'mfaDisableTotpButton') as HTMLButtonElement).disabled).toBe(false);
    expect((element(fixture, 'mfaDisableEmailButton') as HTMLButtonElement).disabled).toBe(false);
  });

  // ---- passkeys

  describe('passkeys', () => {
    let passkeyService: MockedObject<PasskeyService>;
    const credential = {id: 'abc', type: 'public-key'};
    const laptop = {id: 7, name: 'Laptop', createdAt: '2026-10-01T10:00:00', lastUsedAt: null};

    beforeEach(() => {
      passkeyService = TestBed.inject(PasskeyService) as MockedObject<PasskeyService>;
      passkeyService.isSupported.mockReturnValue(true);
      passkeyService.create.mockResolvedValue(credential);
      mfaApiService.setupPasskey = vi.fn().mockReturnValue(of({options: {challenge: 'c'}}));
      mfaApiService.enablePasskey = vi.fn().mockReturnValue(of(undefined));
      mfaApiService.disablePasskey = vi.fn().mockReturnValue(of(undefined));
    });

    function fillPasskeyForm(fixture: Fixture, name: string, code: string) {
      fixture.componentInstance.codeForm.passkeyName().value.set(name);
      fixture.componentInstance.codeForm.passkeyCurrentCode().value.set(code);
      fixture.detectChanges();
    }

    it('adds a passkey as the first method with a name alone', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status()));
      const fixture = await create();

      expect(element(fixture, 'mfaPasskeyCurrentCode')).toBeNull();
      fixture.componentInstance.codeForm.passkeyName().value.set('Laptop');
      await fixture.componentInstance.addPasskey(new Event('submit'));

      expect(mfaApiService.enablePasskey).toHaveBeenCalledWith(credential, 'Laptop', null, expect.anything());
      expect(passkeyService.get).not.toHaveBeenCalled();
    });

    it('proves an existing passkey instead of a code when passkeys are all the user has', async () => {
      const assertion = {id: 'abc', type: 'public-key', response: {}};
      passkeyService.get.mockResolvedValue(assertion);
      mfaApiService.passkeyOptions = vi.fn().mockReturnValue(of({options: {challenge: 'p'}}));
      mfaApiService.getStatus.mockReturnValue(of(status({passkeys: [laptop]})));
      const fixture = await create();

      expect(text(fixture, 'mfaPasskeyProofHint')).toContain('bestehenden');
      expect(text(fixture, 'mfaDisableHint')).toContain('Passkeys');
      expect(element(fixture, 'mfaDisableCode')).toBeNull();

      fixture.componentInstance.codeForm.passkeyName().value.set('Smartphone');
      await fixture.componentInstance.addPasskey(new Event('submit'));
      expect(passkeyService.get).toHaveBeenCalledWith({challenge: 'p'});
      expect(mfaApiService.enablePasskey).toHaveBeenCalledWith(credential, 'Smartphone', {credential: assertion}, expect.anything());

      await fixture.componentInstance.removePasskey(laptop);
      expect(mfaApiService.disablePasskey).toHaveBeenCalledWith(7, {credential: assertion}, expect.anything());
    });

    it('says so when the prompt for the proving passkey is dismissed', async () => {
      passkeyService.get.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
      mfaApiService.passkeyOptions = vi.fn().mockReturnValue(of({options: {challenge: 'p'}}));
      mfaApiService.getStatus.mockReturnValue(of(status({passkeys: [laptop]})));
      const fixture = await create();

      await fixture.componentInstance.removePasskey(laptop);
      fixture.detectChanges();

      expect(text(fixture, 'errorMessage')).toContain('abgebrochen');
      expect(mfaApiService.disablePasskey).not.toHaveBeenCalled();
      expect(fixture.componentInstance.working()).toBe(false);
    });

    it('keeps the last passkey while the deployment requires a method', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({required: true, passkeys: [laptop]})));

      const fixture = await create();

      expect(text(fixture, 'mfaLastMethodHint')).toContain('letzte Methode');
      expect((element(fixture, 'mfaRemovePasskeyButton-7') as HTMLButtonElement).disabled).toBe(true);
    });

    it('does not offer to add one on a browser that cannot, but still lists what is there', async () => {
      passkeyService.isSupported.mockReturnValue(false);
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, passkeys: [laptop]})));

      const fixture = await create();

      expect(text(fixture, 'mfaPasskeyUnsupported')).toContain('unterstützt keine Passkeys');
      expect(text(fixture, 'mfaPasskeyItem')).toContain('Laptop');
      expect(text(fixture, 'mfaPasskeyItem')).toContain('01.10.2026');
      expect(text(fixture, 'mfaPasskeyItem')).toContain('noch nicht verwendet');
      expect(element(fixture, 'mfaPasskeyAddButton')).toBeNull();
    });

    it('does not start without a name and a code of the existing method', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
      const fixture = await create();

      await fixture.componentInstance.addPasskey(new Event('submit'));
      fillPasskeyForm(fixture, 'Laptop', '12');
      await fixture.componentInstance.addPasskey(new Event('submit'));

      expect(mfaApiService.setupPasskey).not.toHaveBeenCalled();
    });

    it('creates the passkey in the browser and hands it in with its name and the code', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
      const fixture = await create();
      fillPasskeyForm(fixture, ' Laptop ', '123 456');

      await fixture.componentInstance.addPasskey(new Event('submit'));

      expect(passkeyService.create).toHaveBeenCalledWith({challenge: 'c'});
      expect(mfaApiService.enablePasskey).toHaveBeenCalledWith(credential, 'Laptop', {code: '123456'}, expect.anything());
      expect(toastr.success).toHaveBeenCalledWith('Passkey hinzugefügt!');
      expect(fixture.componentInstance.codeForm.passkeyName().value()).toBe('');
      expect(fixture.componentInstance.working()).toBe(false);
    });

    it('tells a dismissed prompt apart from a refusal by the backend', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
      const fixture = await create();

      passkeyService.create.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
      fillPasskeyForm(fixture, 'Laptop', '123456');
      await fixture.componentInstance.addPasskey(new Event('submit'));
      fixture.detectChanges();
      expect(text(fixture, 'errorMessage')).toContain('nicht erstellt');
      expect(mfaApiService.enablePasskey).not.toHaveBeenCalled();

      passkeyService.create.mockResolvedValue(credential);
      mfaApiService.enablePasskey = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: {detail: 'Der Code ist ungültig'}
      })));
      fillPasskeyForm(fixture, 'Laptop', '123456');
      await fixture.componentInstance.addPasskey(new Event('submit'));
      fixture.detectChanges();
      expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
      expect(fixture.componentInstance.working()).toBe(false);
    });

    it('removes a passkey with a code, and lets the last code method go while a passkey is left', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, required: true, passkeys: [laptop]})));
      const fixture = await create();

      expect((element(fixture, 'mfaDisableTotpButton') as HTMLButtonElement).disabled).toBe(false);

      type(fixture, 'disableCode', '123456');
      element(fixture, 'mfaRemovePasskeyButton-7')!.click();
      await settle(fixture);

      expect(mfaApiService.disablePasskey).toHaveBeenCalledWith(7, {code: '123456'}, expect.anything());
      expect(toastr.success).toHaveBeenCalledWith('Passkey entfernt!');
    });
  });
});
