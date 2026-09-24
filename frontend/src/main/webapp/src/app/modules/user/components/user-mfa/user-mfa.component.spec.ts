import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {UserMfaComponent} from './user-mfa.component';
import {MfaApiService, MfaStatus} from '../../../../api/mfa-api.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserMfaComponent', () => {
  let mfaApiService: MockedObject<MfaApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let router: {navigate: ReturnType<typeof vi.fn>};
  let authenticationService: {loadUserInfo: ReturnType<typeof vi.fn>};

  const setup = {secret: 'ABCDEFGHJKLMNPQR', otpauthUri: 'otpauth://totp/Tafel:max?secret=ABCDEFGHJKLMNPQR&issuer=Tafel'};
  const status = (overrides: Partial<MfaStatus> = {}): MfaStatus => ({
    totpEnabled: false, emailEnabled: false, required: false, emailAvailable: true, ...overrides
  });

  beforeEach(() => {
    router = {navigate: vi.fn().mockResolvedValue(true)};
    authenticationService = {loadUserInfo: vi.fn().mockResolvedValue({username: 'max', permissions: ['X']})};

    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: router},
        {provide: AuthenticationService, useValue: authenticationService},
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

  function type(fixture: Fixture, field: 'appCode' | 'emailCode' | 'disableCode', code: string) {
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

    expect(mfaApiService.enable).toHaveBeenCalledWith('123456', expect.anything());
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

    fixture.componentInstance.enableApp(new Event('submit'));
    fixture.detectChanges();

    expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
    expect(text(fixture, 'mfaTotpStatus')).toBe('Wird eingerichtet');
    expect(fixture.componentInstance.working()).toBe(false);
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

    expect(mfaApiService.enableEmail).toHaveBeenCalledWith('654321', expect.anything());
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

    expect(mfaApiService.disable).toHaveBeenCalledWith('TOTP', '654321', expect.anything());
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

    fixture.componentInstance.disable('EMAIL');
    fixture.detectChanges();

    expect(text(fixture, 'mfaEmailStatus')).toBe('Aktiv');
    expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
  });

  // ---- the deployment requires it

  it('tells a user who has no method, while the deployment requires one, that nothing else works before', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({required: true})));

    const fixture = await create();

    expect(text(fixture, 'mfaForcedBanner')).toContain('verlangt eine Zwei-Faktor-Authentifizierung');
    expect(element(fixture, 'mfaRequiredHint')).toBeNull();
  });

  it('goes on to the overview once the method that had to be set up was accepted', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({required: true})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123456');
    mfaApiService.getStatus.mockReturnValue(of(status({required: true, totpEnabled: true})));

    fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('does not let the last method be switched off while the deployment requires one', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({required: true, totpEnabled: true})));

    const fixture = await create();

    expect(element(fixture, 'mfaForcedBanner')).toBeNull();
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
});
