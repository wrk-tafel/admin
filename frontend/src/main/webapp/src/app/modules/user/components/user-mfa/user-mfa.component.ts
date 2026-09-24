import {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatDivider} from '@angular/material/divider';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {BrowserQRCodeSvgWriter} from '@zxing/library';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MfaApiService, MfaMethod, MfaSetup, MfaStatus} from '../../../../api/mfa-api.service';

const QR_CODE_SIZE = 220;

/** Six digits, as an authenticator app shows them and as the e-mail carries them (an app may put a space in the middle). */
function codeError(value: string) {
  const code = value.replace(/\s/g, '');
  if (code.length === 0) {
    return {kind: 'required', message: 'Bitte den Code eingeben'};
  }
  return /^\d{6}$/.test(code) ? null : {kind: 'codeFormat', message: 'Der Code besteht aus 6 Ziffern'};
}

/**
 * The "Zwei-Faktor-Authentifizierung" tab of "Mein Konto" - what protects the own login beyond the password. Two methods,
 * which can be used side by side, and either completes a login:
 *
 * - **Authenticator app.** Setting it up is two steps: a secret is handed out and shown as a QR code, and it only
 *   counts once a code from the app for that secret was accepted - which is also what proves the app was set up
 *   correctly before the next login depends on it. The QR code is drawn here in the browser from the `otpauth://`
 *   address, so the secret goes nowhere but this page; it is shown in writing too, for an app that cannot scan.
 * - **Code by e-mail.** A code is sent to the address on the account and has to be entered.
 *
 * Switching a method off asks for a code of either method, so a browser left signed in cannot take the second
 * factor away. When the deployment requires one the last method cannot be switched off, and a user who has none
 * lands on this tab (see `AuthGuardService`) and can do nothing else until one is set up.
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
    MatError
  ]
})
export class UserMfaComponent {
  private readonly mfaApiService = inject(MfaApiService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
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

  /** The deployment requires a second factor and this user has none: the only thing left to do here is to set one up. */
  readonly setupRequired = computed(() => {
    const status = this.status();
    return !!status && status.required && !status.totpEnabled && !status.emailEnabled;
  });

  /** Whether the last method is the only thing left, which cannot be switched off while the deployment requires one. */
  readonly lastMethodLocked = computed(() => {
    const status = this.status();
    return !!status && status.required && status.totpEnabled !== status.emailEnabled;
  });

  readonly anyMethodEnabled = computed(() => !!this.status()?.totpEnabled || !!this.status()?.emailEnabled);

  private readonly formModel = signal({appCode: '', emailCode: '', disableCode: ''});
  codeForm = form(this.formModel, (schemaPath) => {
    validate(schemaPath.appCode, ({value}) => codeError(value()));
    validate(schemaPath.emailCode, ({value}) => codeError(value()));
    validate(schemaPath.disableCode, ({value}) => codeError(value()));
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
    this.submitCode('appCode', code => this.mfaApiService.enable(code, SUPPRESS_ERROR_TOAST_CONTEXT), () => {
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
    this.submitCode('emailCode', code => this.mfaApiService.enableEmail(code, SUPPRESS_ERROR_TOAST_CONTEXT), () => {
      this.emailSetupStarted.set(false);
      this.toastr.success('Code per E-Mail eingerichtet!');
    });
  }

  // ---- switching off

  /** Sends the e-mailed code, for someone who has only that method and needs a code to switch it off. */
  sendDisableCode() {
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
    this.submitCode('disableCode', code => this.mfaApiService.disable(method, code, SUPPRESS_ERROR_TOAST_CONTEXT), () => {
      this.toastr.success(method === 'TOTP' ? 'Authenticator-App entfernt!' : 'Code per E-Mail entfernt!');
    });
  }

  // ---- shared

  private submitCode(
    field: 'appCode' | 'emailCode' | 'disableCode',
    call: (code: string) => ReturnType<MfaApiService['enable']>,
    onSuccess: () => void
  ) {
    this.codeForm[field]().markAsTouched();
    if (!this.codeForm[field]().valid()) {
      return;
    }

    const wasSetupRequired = this.setupRequired();
    this.working.set(true);
    this.clearMessages();
    call(this.codeForm[field]().value().replace(/\s/g, '')).subscribe({
      next: async () => {
        onSuccess();
        this.resetCodes();
        // The answer replaced the session (a method that was just set up completes it), so what the session may do
        // is read again - and a user who had to set one up can now go on.
        await this.authenticationService.loadUserInfo();
        this.loadStatus();
        this.working.set(false);
        if (wasSetupRequired) {
          await this.router.navigate(['uebersicht']);
        }
      },
      error: (error: HttpErrorResponse) => this.fail(error)
    });
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
    this.formModel.set({appCode: '', emailCode: '', disableCode: ''});
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
