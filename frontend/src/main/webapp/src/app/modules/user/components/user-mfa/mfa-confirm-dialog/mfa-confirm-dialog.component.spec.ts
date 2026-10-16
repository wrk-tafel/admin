import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {MfaApiService} from '../../../../../api/mfa-api.service';
import {PasskeyService} from '../../../../../common/security/passkey.service';
import {MfaConfirmDialogComponent, MfaConfirmDialogData} from './mfa-confirm-dialog.component';

describe('MfaConfirmDialogComponent', () => {
  let dialogRef: {close: ReturnType<typeof vi.fn>};
  let mfaApiService: MockedObject<MfaApiService>;
  let passkeyService: MockedObject<PasskeyService>;
  let change: ReturnType<typeof vi.fn>;

  function create(overrides: Partial<MfaConfirmDialogData> = {}) {
    dialogRef = {close: vi.fn()};
    change = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Authenticator-App entfernen', confirmLabel: 'Entfernen', totpEnabled: true, emailEnabled: false, change, ...overrides
          }
        },
        {
          provide: MfaApiService,
          useValue: {
            sendEmailCode: vi.fn().mockReturnValue(of(undefined)),
            passkeyOptions: vi.fn().mockReturnValue(of({options: {challenge: 'p'}}))
          }
        },
        {provide: PasskeyService, useValue: {get: vi.fn()}}
      ]
    });
    mfaApiService = TestBed.inject(MfaApiService) as MockedObject<MfaApiService>;
    passkeyService = TestBed.inject(PasskeyService) as MockedObject<PasskeyService>;
    const fixture = TestBed.createComponent(MfaConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = ReturnType<typeof create>;

  const element = (fixture: Fixture, testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[testid="${testid}"]`);
  const text = (fixture: Fixture, testid: string) => element(fixture, testid)?.textContent?.trim().replace(/\s+/g, ' ');

  function typeCode(fixture: Fixture, code: string) {
    fixture.componentInstance.codeForm.code().value.set(code);
    fixture.detectChanges();
  }

  it('names what is confirmed and asks for a code of the app', () => {
    const fixture = create();

    expect(text(fixture, 'title')).toBe('Authenticator-App entfernen');
    expect(text(fixture, 'mfaConfirmSubmit')).toBe('Entfernen');
    expect(text(fixture, 'mfaConfirmCodeHint')).toContain('aus der Authenticator-App');
    expect(element(fixture, 'mfaConfirmCode')).not.toBeNull();
    expect(element(fixture, 'mfaConfirmSendCodeButton')).toBeNull();
    expect(element(fixture, 'mfaConfirmPasskeyHint')).toBeNull();
  });

  it('looks like a removal when it is one', () => {
    const fixture = create({danger: true});

    expect(element(fixture, 'header')!.className).toContain('dialog-header-danger');
    expect(element(fixture, 'mfaConfirmSubmit')!.classList).toContain('button-danger');
  });

  it('does not run the change without a code of six digits', async () => {
    const fixture = create();

    await fixture.componentInstance.confirm(new Event('submit'));
    typeCode(fixture, '123');
    await fixture.componentInstance.confirm(new Event('submit'));

    expect(change).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('runs the change with the code and closes once it went through', async () => {
    const fixture = create();
    typeCode(fixture, '123 456');

    await fixture.componentInstance.confirm(new Event('submit'));

    expect(change).toHaveBeenCalledWith({code: '123456'});
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('stays open with the refusal and an empty field when the code is wrong', async () => {
    const fixture = create();
    change.mockRejectedValue(new HttpErrorResponse({status: 400, error: {detail: 'Der Code ist ungültig'}}));
    typeCode(fixture, '123456');

    await fixture.componentInstance.confirm(new Event('submit'));
    fixture.detectChanges();

    expect(text(fixture, 'mfaConfirmError')).toBe('Der Code ist ungültig');
    expect(fixture.componentInstance.codeForm.code().value()).toBe('');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.working()).toBe(false);
  });

  it('offers to send a code by e-mail while that method is on', () => {
    const fixture = create({totpEnabled: false, emailEnabled: true});
    expect(text(fixture, 'mfaConfirmCodeHint')).toContain('per E-Mail gesendet');

    element(fixture, 'mfaConfirmSendCodeButton')!.click();
    fixture.detectChanges();

    expect(mfaApiService.sendEmailCode).toHaveBeenCalled();
    expect(text(fixture, 'mfaConfirmInfo')).toContain('gesendet');
  });

  it('names both sources of a code while both code methods are on', () => {
    const fixture = create({totpEnabled: true, emailEnabled: true});

    expect(text(fixture, 'mfaConfirmCodeHint')).toContain('aus der Authenticator-App oder per E-Mail');
    expect(element(fixture, 'mfaConfirmSendCodeButton')).not.toBeNull();
  });

  it('says so when a new code is asked for too soon', () => {
    const fixture = create({emailEnabled: true});
    mfaApiService.sendEmailCode.mockReturnValue(throwError(() => new HttpErrorResponse({status: 429})));

    element(fixture, 'mfaConfirmSendCodeButton')!.click();
    fixture.detectChanges();

    expect(text(fixture, 'mfaConfirmError')).toContain('einen Moment warten');
  });

  it('asks one of the passkeys when that is all the user has', async () => {
    const fixture = create({totpEnabled: false, emailEnabled: false, confirmLabel: 'Hinzufügen'});
    const assertion = {id: 'abc', type: 'public-key', response: {}};
    passkeyService.get.mockResolvedValue(assertion);

    expect(element(fixture, 'mfaConfirmCode')).toBeNull();
    expect(text(fixture, 'mfaConfirmPasskeyHint')).toContain('"Hinzufügen"');

    await fixture.componentInstance.confirm(new Event('submit'));

    expect(passkeyService.get).toHaveBeenCalledWith({challenge: 'p'});
    expect(change).toHaveBeenCalledWith({credential: assertion});
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('says so when the passkey prompt is dismissed, in the words the caller chose', async () => {
    const fixture = create({totpEnabled: false, emailEnabled: false, promptError: 'Der Passkey wurde nicht erstellt'});
    passkeyService.get.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));

    await fixture.componentInstance.confirm(new Event('submit'));
    fixture.detectChanges();

    expect(text(fixture, 'mfaConfirmError')).toBe('Der Passkey wurde nicht erstellt');
    expect(change).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes without a result when backed out of', () => {
    const fixture = create();

    element(fixture, 'mfaConfirmCancel')!.click();

    expect(dialogRef.close).toHaveBeenCalledWith();
    expect(change).not.toHaveBeenCalled();
  });
});
