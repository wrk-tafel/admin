import {DatePipe} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatDivider} from '@angular/material/divider';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {BrowserQRCodeSvgWriter} from '@zxing/library';
import {firstValueFrom} from 'rxjs';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MfaApiService, MfaMethod, MfaPasskeyItem, MfaProof, MfaSetup, MfaStatus} from '../../../../api/mfa-api.service';
import {PasskeyService} from '../../../../common/security/passkey.service';

const QR_CODE_SIZE = 220;
const PASSKEY_NAME_MAX_LENGTH = 100;

type CodeField = keyof ReturnType<typeof emptyCodes>;

function emptyCodes() {
  return {appCode: '', emailCode: '', disableCode: '', appCurrentCode: '', emailCurrentCode: '', passkeyName: '', passkeyCurrentCode: ''};
}

/** Six digits, as an authenticator app shows them and as the e-mail carries them (an app may put a space in the middle). */
function codeError(value: string) {
  const code = value.replace(/\s/g, '');
  if (code.length === 0) {
    return {kind: 'required', message: 'Bitte den Code eingeben'};
  }
  return /^\d{6}$/.test(code) ? null : {kind: 'codeFormat', message: 'Der Code besteht aus 6 Ziffern'};
}

/**
 * The "Zwei-Faktor-Authentifizierung" tab of "Mein Konto" - what protects the own login beyond the password. Three
 * methods, which can be used side by side, and any one completes a login:
 *
 * - **Authenticator app.** Setting it up is two steps: a secret is handed out and shown as a QR code, and it only
 *   counts once a code from the app for that secret was accepted - which is also what proves the app was set up
 *   correctly before the next login depends on it. The QR code is drawn here in the browser from the `otpauth://`
 *   address, so the secret goes nowhere but this page; it is shown in writing too, for an app that cannot scan.
 * - **Code by e-mail.** A code is sent to the address on the account and has to be entered. A user with no address
 *   on record is sent to the "Meine Daten" tab to add one, instead of being offered a method that cannot work.
 *
 * - **Passkeys.** A passkey completes a login without a code; it is added with a name, and the browser and the
 *   device do the rest (`PasskeyService`). A user can have several.
 *
 * Switching a method off asks for proof of a method the user has, so a browser left signed in cannot take the
 * second factor away - and so does adding a method next to one that is on already, or a browser left signed in
 * could put its own next to the user's. The proof is a code while the app or the e-mail code is on, and the
 * answer of a passkey for a user who has nothing else (`proof`). When the deployment requires one the last
 * method cannot be switched off. A user who has none yet never reaches this tab in the
 * first place while the requirement is on - `AuthGuardService` sends that session to `LoginMfaSetupComponent`
 * on the login flow instead.
 */
@Component({
  selector: 'tafel-user-mfa',
  templateUrl: 'user-mfa.component.html',
  imports: [
    FormField,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatButton,
    MatDivider,
    MatFormField,
    MatInput,
    MatLabel,
    MatError,
    MatHint,
    RouterLink,
    DatePipe
  ]
})
export class UserMfaComponent {
  private readonly mfaApiService = inject(MfaApiService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly passkeyService = inject(PasskeyService);
  private readonly toastr = inject(TafelToastrService);

  private readonly qrContainer = viewChild<ElementRef<HTMLElement>>('qrContainer');
  private readonly banner = viewChild<ElementRef<HTMLElement>>('banner');

  /** `null` until the status has been read. */
  status = signal<MfaStatus | null>(null);
  /** Set between "Einrichten" and a code being accepted. */
  appSetup = signal<MfaSetup | null>(null);
  /** A code was sent to set the e-mail method up and has not been entered yet. */
  emailSetupStarted = signal(false);
  working = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  /** The secret in groups of four, which is how it is easiest to copy by eye. */
  readonly formattedSecret = computed(() => this.appSetup()?.secret.match(/.{1,4}/g)?.join(' ') ?? '');

  readonly passkeys = computed(() => this.status()?.passkeys ?? []);
  /** Whether this browser can create a passkey at all - one that cannot still lists them. */
  readonly passkeySupported = this.passkeyService.isSupported();

  /** The app or the e-mail code is on, so a change is proven with a code. */
  readonly codeMethodEnabled = computed(() => !!this.status()?.totpEnabled || !!this.status()?.emailEnabled);
  /** Passkeys are all the user has, so a change is proven with one of them. */
  readonly provesWithPasskey = computed(() => !this.codeMethodEnabled() && this.passkeys().length > 0);
  readonly anyMethodEnabled = computed(() => this.codeMethodEnabled() || this.passkeys().length > 0);

  /** Whether the last method is the only thing left, which cannot be switched off while the deployment requires one. */
  readonly lastMethodLocked = computed(() => {
    const status = this.status();
    const methods = [status?.totpEnabled, status?.emailEnabled, this.passkeys().length > 0].filter(Boolean).length;
    return !!status && status.required && methods === 1;
  });

  private readonly formModel = signal(emptyCodes());
  codeForm = form(this.formModel, (schemaPath) => {
    validate(schemaPath.appCode, ({value}) => codeError(value()));
    validate(schemaPath.emailCode, ({value}) => codeError(value()));
    // a code of an existing method is only asked for while there is one to give - see proof()
    validate(schemaPath.disableCode, ({value}) => this.codeMethodEnabled() ? codeError(value()) : null);
    validate(schemaPath.appCurrentCode, ({value}) => this.codeMethodEnabled() ? codeError(value()) : null);
    validate(schemaPath.emailCurrentCode, ({value}) => this.codeMethodEnabled() ? codeError(value()) : null);
    validate(schemaPath.passkeyCurrentCode, ({value}) => this.codeMethodEnabled() ? codeError(value()) : null);
    validate(schemaPath.passkeyName, ({value}) => {
      const name = value().trim();
      if (name.length === 0) {
        return {kind: 'required', message: 'Bitte einen Namen eingeben'};
      }
      return name.length <= PASSKEY_NAME_MAX_LENGTH ? null : {kind: 'maxLength', message: `Höchstens ${PASSKEY_NAME_MAX_LENGTH} Zeichen`};
    });
  });

  constructor() {
    this.loadStatus();

    // The container only exists once a setup is shown, so drawing waits for both.
    effect(() => {
      const setup = this.appSetup();
      const container = this.qrContainer()?.nativeElement;
      if (!setup || !container) {
        return;
      }
      const svg = new BrowserQRCodeSvgWriter().write(setup.otpauthUri, QR_CODE_SIZE, QR_CODE_SIZE);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'QR-Code zum Einrichten der Authenticator-App');
      container.replaceChildren(svg);
    });

    // A message sits at the top of the page while the button that caused it may be far below (under the QR code),
    // so it is brought into view instead of appearing where nobody looks.
    effect(() => this.banner()?.nativeElement.scrollIntoView?.({block: 'nearest'}));
  }

  private loadStatus() {
    this.mfaApiService.getStatus().subscribe(status => this.status.set(status));
  }

  // ---- authenticator app

  startAppSetup() {
    this.working.set(true);
    this.clearMessages();
    this.mfaApiService.setup().subscribe({
      next: setup => {
        this.appSetup.set(setup);
        this.working.set(false);
      },
      error: () => this.working.set(false)
    });
  }

  cancelAppSetup() {
    this.appSetup.set(null);
    this.clearMessages();
    this.resetCodes();
  }

  enableApp(event: Event) {
    event.preventDefault();
    return this.run(['appCode'], 'appCurrentCode', async () => {
      const proof = await this.proof('appCurrentCode');
      await firstValueFrom(this.mfaApiService.enable(this.code('appCode'), proof, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.appSetup.set(null);
      this.toastr.success('Authenticator-App eingerichtet!');
    });
  }

  // ---- e-mail

  startEmailSetup() {
    this.working.set(true);
    this.clearMessages();
    this.mfaApiService.setupEmail(SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.emailSetupStarted.set(true);
        this.infoMessage.set('Ein Code wurde an Ihre E-Mail-Adresse gesendet.');
        this.working.set(false);
      },
      error: (error: HttpErrorResponse) => this.fail(error)
    });
  }

  cancelEmailSetup() {
    this.emailSetupStarted.set(false);
    this.clearMessages();
    this.resetCodes();
  }

  enableEmail(event: Event) {
    event.preventDefault();
    return this.run(['emailCode'], 'emailCurrentCode', async () => {
      const proof = await this.proof('emailCurrentCode');
      await firstValueFrom(this.mfaApiService.enableEmail(this.code('emailCode'), proof, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.emailSetupStarted.set(false);
      this.toastr.success('Code per E-Mail eingerichtet!');
    });
  }

  // ---- passkeys

  /**
   * Adds a passkey: the backend hands out the options, the browser lets the device create the key, and the backend
   * stores it once the proof of an existing method checks out. A prompt the user dismisses is no error of the
   * application, so it is told apart from a refusal by the backend.
   */
  addPasskey(event: Event) {
    event.preventDefault();
    return this.run(['passkeyName'], 'passkeyCurrentCode', async () => {
      const name = this.codeForm.passkeyName().value().trim();
      const {options} = await firstValueFrom(this.mfaApiService.setupPasskey(SUPPRESS_ERROR_TOAST_CONTEXT));
      const credential = await this.passkeyService.create(options);
      const proof = await this.proof('passkeyCurrentCode');
      await firstValueFrom(this.mfaApiService.enablePasskey(credential, name, proof, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.toastr.success('Passkey hinzugefügt!');
    }, 'Der Passkey wurde nicht erstellt - der Vorgang wurde abgebrochen, oder dieses Gerät hat bereits einen Passkey für dieses Konto.');
  }

  removePasskey(passkey: MfaPasskeyItem) {
    return this.run([], 'disableCode', async () => {
      await firstValueFrom(this.mfaApiService.disablePasskey(passkey.id, (await this.proof('disableCode'))!, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.toastr.success('Passkey entfernt!');
    });
  }

  // ---- switching off

  /**
   * Sends the e-mailed code, for someone who has the e-mail method and needs a code of it - to switch a method
   * off, or to prove they hold the method they have before adding another.
   */
  sendExistingMethodCode() {
    this.working.set(true);
    this.clearMessages();
    this.mfaApiService.sendEmailCode(SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.infoMessage.set('Ein Code wurde an Ihre E-Mail-Adresse gesendet.');
        this.working.set(false);
      },
      error: (error: HttpErrorResponse) => this.fail(error)
    });
  }

  disable(method: MfaMethod) {
    return this.run([], 'disableCode', async () => {
      await firstValueFrom(this.mfaApiService.disable(method, (await this.proof('disableCode'))!, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.toastr.success(method === 'TOTP' ? 'Authenticator-App entfernt!' : 'Code per E-Mail entfernt!');
    });
  }

  // ---- shared

  private code(field: CodeField) {
    return this.codeForm[field]().value().replace(/\s/g, '');
  }

  /**
   * Proof of a method the user already has, which every change but the very first setup takes: the code typed into
   * `codeField` while the app or the e-mail code is on, otherwise the answer of one of the user's passkeys - the
   * browser asks for it. `null` while there is no method to prove.
   */
  private async proof(codeField: CodeField): Promise<MfaProof | null> {
    if (this.codeMethodEnabled()) {
      return {code: this.code(codeField)};
    }
    if (!this.provesWithPasskey()) {
      return null;
    }
    const {options} = await firstValueFrom(this.mfaApiService.passkeyOptions(SUPPRESS_ERROR_TOAST_CONTEXT));
    return {credential: await this.passkeyService.get(options)};
  }

  /**
   * Runs one change: `fields` - and `proofField`, while a code is what proves an existing method - have to be valid
   * first. A refusal by the backend shows its message; anything else came from the browser's passkey prompt (it
   * was dismissed, or no passkey is at hand) and shows `promptError`.
   */
  private async run(
    fields: CodeField[],
    proofField: CodeField,
    change: () => Promise<void>,
    promptError = 'Die Bestätigung mit dem Passkey wurde abgebrochen oder ist nicht möglich - bitte erneut versuchen.'
  ) {
    const required = this.codeMethodEnabled() ? [...fields, proofField] : fields;
    required.forEach(field => this.codeForm[field]().markAsTouched());
    if (required.some(field => !this.codeForm[field]().valid())) {
      return;
    }

    this.working.set(true);
    this.clearMessages();
    try {
      await change();
      this.resetCodes();
      // A form that stays on the page must not greet the user with "required" errors.
      required.forEach(field => this.codeForm[field]().reset());
      // The answer may have replaced the session (a method that was just set up completes it), so what the session
      // may do is read again.
      await this.authenticationService.loadUserInfo();
      this.loadStatus();
      this.working.set(false);
    } catch (error) {
      // What the browser's passkey prompt throws is an Error; a refusal by the backend is not.
      if (error instanceof Error) {
        this.errorMessage.set(promptError);
        this.working.set(false);
      } else {
        this.fail(error as HttpErrorResponse);
      }
    }
  }

  private fail(error: HttpErrorResponse) {
    this.errorMessage.set(error.status === 429
      ? 'Bitte einen Moment warten, bevor ein neuer Code angefordert wird!'
      : extractErrorMessage(error));
    this.resetCodes();
    this.working.set(false);
  }

  private clearMessages() {
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  private resetCodes() {
    this.formModel.set(emptyCodes());
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
