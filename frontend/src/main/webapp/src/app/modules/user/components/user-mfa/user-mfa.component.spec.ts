import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {EMPTY, from, of, throwError} from 'rxjs';
import {maskEmail, UserMfaComponent} from './user-mfa.component';
import {HttpErrorResponse} from '@angular/common/http';
import {MfaApiService, MfaPasskeyItem, MfaProof, MfaStatus} from '../../../../api/mfa-api.service';
import {PasskeyService} from '../../../../common/security/passkey.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MfaConfirmDialogComponent, MfaConfirmDialogData} from './mfa-confirm-dialog/mfa-confirm-dialog.component';

describe('UserMfaComponent', () => {
  let mfaApiService: MockedObject<MfaApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let dialog: {open: ReturnType<typeof vi.fn>};
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
  const laptop: MfaPasskeyItem = {id: 7, name: 'Laptop', kind: 'DEVICE', createdAt: '2026-10-01T10:00:00', lastUsedAt: null};
  const yubikey: MfaPasskeyItem = {
    id: 8, name: 'YubiKey', kind: 'SECURITY_KEY', createdAt: '2026-10-02T10:00:00', lastUsedAt: '2026-10-12T10:00:00'
  };

  beforeEach(() => {
    router = {
      navigate: vi.fn().mockResolvedValue(true),
      // the pointer to the "Meine Daten" page is a RouterLink, which builds its href from these two
      createUrlTree: vi.fn().mockReturnValue({}),
      serializeUrl: vi.fn().mockReturnValue('/konto/daten'),
      events: EMPTY
    };
    authenticationService = {loadUserInfo: vi.fn().mockResolvedValue({username: 'max', permissions: ['X']})};
    // the dialog is backed out of unless a test answers it
    dialog = {open: vi.fn().mockReturnValue({afterClosed: () => of(undefined)})};

    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: router},
        {provide: ActivatedRoute, useValue: {}},
        {provide: AuthenticationService, useValue: authenticationService},
        {provide: MatDialog, useValue: dialog},
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
  const text = (fixture: Fixture, testid: string) => element(fixture, testid)?.textContent?.trim().replace(/\s+/g, ' ');

  function type(fixture: Fixture, field: 'appCode' | 'emailCode' | 'passkeyName', value: string) {
    fixture.componentInstance.setupForm[field]().value.set(value);
    fixture.detectChanges();
  }

  async function settle(fixture: Fixture) {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** The dialog is confirmed with `proof`: it runs the change with it and closes with `true` once that went through. */
  function confirmDialogWith(proof: MfaProof) {
    dialog.open.mockImplementation((_component: unknown, config: {data: MfaConfirmDialogData}) => ({
      afterClosed: () => from(config.data.change(proof).then(() => true))
    }));
  }

  const dialogData = (): MfaConfirmDialogData => dialog.open.mock.calls[0][1].data;

  // ---- summary

  it('says the account has nothing but the password while no method is on', async () => {
    const fixture = await create();

    expect(text(fixture, 'mfaSummaryTitle')).toContain('nur durch das Passwort geschützt');
    expect(element(fixture, 'mfaSummary')!.classList).toContain('tafel-banner-warning');
    expect(element(fixture, 'mfaWarning')).toBeNull();
  });

  it('counts the active methods, a list of passkeys as one', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, passkeys: [laptop, yubikey]})));
    const fixture = await create();

    expect(text(fixture, 'mfaSummaryTitle')).toBe('Ihr Konto ist geschützt - 2 von 3 Methoden aktiv');
    expect(element(fixture, 'mfaSummary')!.classList).toContain('tafel-banner-success');
    expect(element(fixture, 'mfaWarning')).toBeNull();
    expect(text(fixture, 'mfaPasskeyStatus')).toBe('2 eingerichtet');
  });

  it.each([
    [{emailEnabled: true}, 'Nur der Code per E-Mail'],
    [{totpEnabled: true}, 'Nur eine Methode'],
    [{passkeys: [laptop]}, 'Nur ein Passkey']
  ])('warns about a fragile setup: %o', async (overrides, warning) => {
    mfaApiService.getStatus.mockReturnValue(of(status(overrides)));
    const fixture = await create();

    expect(text(fixture, 'mfaWarning')).toContain(warning);
    expect(element(fixture, 'mfaSummary')!.classList).toContain('tafel-banner-warning');
  });

  it('does not warn about several passkeys on their own', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({passkeys: [laptop, yubikey]})));
    const fixture = await create();

    expect(element(fixture, 'mfaWarning')).toBeNull();
  });

  // ---- rows

  it('shows every method as a closed row with its status, which opens on a click', async () => {
    const fixture = await create();

    expect(text(fixture, 'mfaTotpStatus')).toBe('Nicht aktiv');
    expect(text(fixture, 'mfaEmailStatus')).toBe('Nicht aktiv');
    expect(text(fixture, 'mfaPasskeyStatus')).toBe('Nicht aktiv');
    for (const row of ['app', 'email', 'passkey']) {
      expect(element(fixture, `mfaRowPanel-${row}`)!.hidden).toBe(true);
      expect(element(fixture, `mfaRowToggle-${row}`)!.getAttribute('aria-expanded')).toBe('false');
    }

    element(fixture, 'mfaRowToggle-email')!.click();
    fixture.detectChanges();
    expect(element(fixture, 'mfaRowPanel-email')!.hidden).toBe(false);
    expect(element(fixture, 'mfaRowToggle-email')!.getAttribute('aria-expanded')).toBe('true');
    expect(element(fixture, 'mfaRowPanel-app')!.hidden).toBe(true);

    element(fixture, 'mfaRowToggle-email')!.click();
    fixture.detectChanges();
    expect(element(fixture, 'mfaRowPanel-email')!.hidden).toBe(true);
  });

  it('masks the address in the e-mail row\'s summary', async () => {
    const fixture = await create();

    expect(text(fixture, 'mfaEmailSummary')).toBe('an m***@example.org');
    expect(maskEmail('erika@example.at')).toBe('e***@example.at');
    expect(maskEmail('no-at-sign')).toBe('no-at-sign');
  });

  // ---- authenticator app

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
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('switches the app on as the first method without asking for proof, and reads the status and the session again', async () => {
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123 456');
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));

    await fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(dialog.open).not.toHaveBeenCalled();
    expect(mfaApiService.enable).toHaveBeenCalledWith('123456', null, expect.anything());
    expect(authenticationService.loadUserInfo).toHaveBeenCalled();
    expect(text(fixture, 'mfaTotpStatus')).toBe('Aktiv');
    expect(toastr.success).toHaveBeenCalledWith('Authenticator-App eingerichtet!');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows why the first app code was refused and stays in the setup', async () => {
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
  it('confirms adding the app next to the e-mail method in the dialog, with a code of it', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123456');
    confirmDialogWith({code: '654321'});

    await fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(dialog.open).toHaveBeenCalledWith(MfaConfirmDialogComponent, expect.anything());
    expect(dialogData()).toEqual(expect.objectContaining({title: 'Authenticator-App aktivieren', totpEnabled: false, emailEnabled: true}));
    expect(mfaApiService.enable).toHaveBeenCalledWith('123456', {code: '654321'}, expect.anything());
    expect(toastr.success).toHaveBeenCalledWith('Authenticator-App eingerichtet!');
  });

  // A refused enable may be about the app code on the page (gone stale while an e-mail code was fetched), which only
  // the page can take again - so the dialog hands the refusal back instead of asking for its own code forever.
  it('shows a refused second method on the page, with the setup still open for a fresh code', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));
    mfaApiService.enable.mockReturnValue(throwError(() => new HttpErrorResponse({status: 400, error: {detail: 'Der Code ist ungültig'}})));
    const fixture = await create();
    fixture.componentInstance.startAppSetup();
    type(fixture, 'appCode', '123456');
    dialog.open.mockImplementation((_component: unknown, config: {data: MfaConfirmDialogData}) => ({
      afterClosed: () => from(config.data.change({code: '654321'}).then(() => true, error => error))
    }));

    await fixture.componentInstance.enableApp(new Event('submit'));
    await settle(fixture);

    expect(dialogData().closeOnRefusal).toBe(true);
    expect(text(fixture, 'errorMessage')).toBe('Der Code ist ungültig');
    expect(text(fixture, 'mfaTotpStatus')).toBe('Wird eingerichtet');
    expect(fixture.componentInstance.setupForm.appCode().value()).toBe('');
    expect(fixture.componentInstance.working()).toBe(false);
  });

  it('changes nothing when the dialog is backed out of', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
    const fixture = await create();
    fixture.componentInstance.startEmailSetup();
    type(fixture, 'emailCode', '654321');

    await fixture.componentInstance.enableEmail(new Event('submit'));
    await settle(fixture);

    expect(dialog.open).toHaveBeenCalled();
    expect(mfaApiService.enableEmail).not.toHaveBeenCalled();
    expect(authenticationService.loadUserInfo).not.toHaveBeenCalled();
    expect(text(fixture, 'mfaEmailStatus')).toBe('Wird eingerichtet');
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
    await fixture.componentInstance.enableEmail(new Event('submit'));
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

  it('sends a user with no address to the "Meine Daten" page instead of offering the e-mail method', async () => {
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

    expect(text(fixture, 'mfaEmailStatus')).toBe('Nicht verfügbar');
    expect(text(fixture, 'mfaEmailUnavailable')).toContain('kein E-Mail-Versand');
    expect(element(fixture, 'mfaEmailSetupButton')).toBeNull();
  });

  // ---- removing a code method

  it('removes the app from its own row, confirmed in the dialog, naming the method', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, emailEnabled: true})));
    const fixture = await create();
    expect(element(fixture, 'mfaRowPanel-app')!.contains(element(fixture, 'mfaDisableTotpButton'))).toBe(true);
    confirmDialogWith({code: '654321'});
    mfaApiService.getStatus.mockReturnValue(of(status({emailEnabled: true})));

    await fixture.componentInstance.disable('TOTP');
    await settle(fixture);

    expect(dialogData()).toEqual(expect.objectContaining({
      title: 'Authenticator-App entfernen', danger: true, totpEnabled: true, emailEnabled: true
    }));
    expect(mfaApiService.disable).toHaveBeenCalledWith('TOTP', {code: '654321'}, expect.anything());
    expect(text(fixture, 'mfaTotpStatus')).toBe('Nicht aktiv');
    expect(toastr.success).toHaveBeenCalledWith('Authenticator-App entfernt!');
  });

  it('leaves a refused removal to the dialog, which stays open', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, emailEnabled: true})));
    mfaApiService.disable.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Der Code ist ungültig'}})));
    const fixture = await create();
    let refusal: unknown;
    dialog.open.mockImplementation((_component: unknown, config: {data: MfaConfirmDialogData}) => ({
      afterClosed: () => from(config.data.change({code: '000000'}).catch(error => {
        refusal = error;
        return undefined;
      }))
    }));

    await fixture.componentInstance.disable('EMAIL');
    await settle(fixture);

    expect(refusal).toEqual(expect.objectContaining({status: 400}));
    expect(text(fixture, 'mfaEmailStatus')).toBe('Aktiv');
    expect(toastr.success).not.toHaveBeenCalled();
    expect(fixture.componentInstance.working()).toBe(false);
  });

  // ---- the deployment requires it

  it('does not let the last method be removed while the deployment requires one', async () => {
    mfaApiService.getStatus.mockReturnValue(of(status({required: true, totpEnabled: true})));

    const fixture = await create();

    expect(text(fixture, 'mfaRequiredHint')).toContain('Eine Methode muss immer eingerichtet bleiben');
    expect(text(fixture, 'mfaLastMethodHint')).toContain('kann daher nicht entfernt werden');
    expect((element(fixture, 'mfaDisableTotpButton') as HTMLButtonElement).disabled).toBe(true);
  });

  it('lets one of two methods be removed while the deployment requires one', async () => {
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

    beforeEach(() => {
      passkeyService = TestBed.inject(PasskeyService) as MockedObject<PasskeyService>;
      passkeyService.isSupported.mockReturnValue(true);
      passkeyService.create.mockResolvedValue(credential);
      mfaApiService.setupPasskey = vi.fn().mockReturnValue(of({options: {challenge: 'c'}}));
      mfaApiService.enablePasskey = vi.fn().mockReturnValue(of(undefined));
      mfaApiService.disablePasskey = vi.fn().mockReturnValue(of(undefined));
    });

    it('adds a passkey as the first method with a name alone', async () => {
      const fixture = await create();

      type(fixture, 'passkeyName', 'Laptop');
      await fixture.componentInstance.addPasskey(new Event('submit'));

      expect(dialog.open).not.toHaveBeenCalled();
      expect(mfaApiService.enablePasskey).toHaveBeenCalledWith(credential, 'Laptop', null, expect.anything());
      expect(passkeyService.create).toHaveBeenCalledWith({challenge: 'c'}, false);
      expect(passkeyService.get).not.toHaveBeenCalled();
    });

    it('asks the browser for a security key from its own button', async () => {
      const fixture = await create();

      type(fixture, 'passkeyName', 'YubiKey');
      element(fixture, 'mfaSecurityKeyAddButton')!.click();
      await fixture.whenStable();

      expect(passkeyService.create).toHaveBeenCalledWith({challenge: 'c'}, true);
      expect(mfaApiService.enablePasskey).toHaveBeenCalledWith(credential, 'YubiKey', null, expect.anything());
    });

    it('says so when the first passkey is not created', async () => {
      passkeyService.create.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
      const fixture = await create();

      type(fixture, 'passkeyName', 'Laptop');
      await fixture.componentInstance.addPasskey(new Event('submit'));
      fixture.detectChanges();

      expect(text(fixture, 'errorMessage')).toContain('nicht erstellt');
      expect(mfaApiService.enablePasskey).not.toHaveBeenCalled();
      expect(fixture.componentInstance.working()).toBe(false);
    });

    it('lists the passkeys with their kind, and when they were added and used', async () => {
      const unknown: MfaPasskeyItem = {...laptop, id: 9, name: 'Alt', kind: 'UNKNOWN'};
      mfaApiService.getStatus.mockReturnValue(of(status({passkeys: [laptop, yubikey, unknown]})));
      const fixture = await create();

      const items = fixture.nativeElement.querySelectorAll('[testid="mfaPasskeyItem"]') as NodeListOf<HTMLElement>;
      expect(items[0].textContent).toContain('Laptop');
      expect(items[0].textContent).toContain('(Gerät)');
      expect(items[0].textContent).toContain('01.10.2026');
      expect(items[0].textContent).toContain('noch nicht verwendet');
      expect(items[1].textContent).toContain('(Sicherheitsschlüssel)');
      expect(items[1].textContent).toContain('zuletzt verwendet am 12.10.2026');
      expect(items[2].querySelector('[testid="mfaPasskeyKind"]')).toBeNull();
      expect(items[1].querySelector('[testid="mfaRemovePasskeyButton-8"]')).not.toBeNull();
    });

    it('hands the dialog what the user has, so it can ask for a passkey when that is all there is', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({passkeys: [laptop]})));
      const fixture = await create();
      const assertion = {id: 'abc', type: 'public-key', response: {}};
      confirmDialogWith({credential: assertion});

      type(fixture, 'passkeyName', 'Smartphone');
      await fixture.componentInstance.addPasskey(new Event('submit'));
      await settle(fixture);

      expect(dialogData()).toEqual(expect.objectContaining({title: 'Passkey hinzufügen', totpEnabled: false, emailEnabled: false}));
      expect(dialogData().promptError).toContain('nicht erstellt');
      expect(mfaApiService.enablePasskey).toHaveBeenCalledWith(credential, 'Smartphone', {credential: assertion}, expect.anything());
      expect(toastr.success).toHaveBeenCalledWith('Passkey hinzugefügt!');
      expect(fixture.componentInstance.setupForm.passkeyName().value()).toBe('');
    });

    it('removes a passkey from its entry, confirmed in the dialog', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, passkeys: [laptop]})));
      const fixture = await create();
      confirmDialogWith({code: '123456'});

      element(fixture, 'mfaRemovePasskeyButton-7')!.click();
      await settle(fixture);
      await settle(fixture);

      expect(dialogData()).toEqual(expect.objectContaining({title: 'Passkey "Laptop" entfernen', danger: true}));
      expect(mfaApiService.disablePasskey).toHaveBeenCalledWith(7, {code: '123456'}, expect.anything());
      expect(toastr.success).toHaveBeenCalledWith('Passkey entfernt!');
    });

    it('keeps the last passkey while the deployment requires a method', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({required: true, passkeys: [laptop]})));

      const fixture = await create();

      expect(text(fixture, 'mfaLastMethodHint')).toContain('letzte Methode');
      expect((element(fixture, 'mfaRemovePasskeyButton-7') as HTMLButtonElement).disabled).toBe(true);
    });

    it('lets the last code method go while a passkey is left, even when the deployment requires a method', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, required: true, passkeys: [laptop]})));

      const fixture = await create();

      expect((element(fixture, 'mfaDisableTotpButton') as HTMLButtonElement).disabled).toBe(false);
      expect((element(fixture, 'mfaRemovePasskeyButton-7') as HTMLButtonElement).disabled).toBe(false);
    });

    it('does not offer to add one on a browser that cannot, but still lists what is there', async () => {
      passkeyService.isSupported.mockReturnValue(false);
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true, passkeys: [laptop]})));

      const fixture = await create();

      expect(text(fixture, 'mfaPasskeyUnsupported')).toContain('unterstützt keine Passkeys');
      expect(text(fixture, 'mfaPasskeyItem')).toContain('Laptop');
      expect(element(fixture, 'mfaPasskeyAddButton')).toBeNull();
    });

    it('does not start without a name', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
      const fixture = await create();

      await fixture.componentInstance.addPasskey(new Event('submit'));

      expect(dialog.open).not.toHaveBeenCalled();
      expect(mfaApiService.setupPasskey).not.toHaveBeenCalled();
    });

    it('lets a refusal by the backend through to the dialog', async () => {
      mfaApiService.getStatus.mockReturnValue(of(status({totpEnabled: true})));
      mfaApiService.enablePasskey = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: {detail: 'Der Code ist ungültig'}
      })));
      const fixture = await create();
      let refusal: unknown;
      dialog.open.mockImplementation((_component: unknown, config: {data: MfaConfirmDialogData}) => ({
        afterClosed: () => from(config.data.change({code: '123456'}).catch(error => {
          refusal = error;
          return undefined;
        }))
      }));

      type(fixture, 'passkeyName', 'Laptop');
      await fixture.componentInstance.addPasskey(new Event('submit'));
      await settle(fixture);

      expect(refusal).toBeInstanceOf(HttpErrorResponse);
      expect(toastr.success).not.toHaveBeenCalled();
      expect(fixture.componentInstance.working()).toBe(false);
    });
  });
});
