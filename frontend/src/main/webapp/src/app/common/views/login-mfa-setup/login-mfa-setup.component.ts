import {HttpErrorResponse} from '@angular/common/http';
import {NgOptimizedImage} from '@angular/common';
import {Component, computed, effect, ElementRef, inject, OnInit, signal, viewChild} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatDivider} from '@angular/material/divider';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {BrowserQRCodeSvgWriter} from '@zxing/library';
import {extractErrorMessage} from '../../api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../http/suppress-error-toast.token';
import {AuthenticationService} from '../../security/authentication.service';
import {visibleErrorMessages} from '../../util/signal-form-helper';
import {email} from '../../validator/signal-form-validators';
import {MfaApiService, MfaSetup, MfaStatus} from '../../../api/mfa-api.service';
import {UserAccountData, UserApiService} from '../../../api/user-api.service';

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
 * The last step of a login for a user whose deployment requires two-factor authentication (see ADR-0058) and who
 * has neither method yet: the password was right, but the session does nothing until one is set up, and this is
 * where that happens - as part of the login flow itself, the same way `LoginMfaComponent` is for a code that is
 * merely owed. `AuthGuardService` sends every route to this page while `mfaSetupRequired`, so a user in this
 * situation is never let into the application itself to set a method up there. Setting either method up completes
 * the login and goes on exactly where a plain login would have (`uebersicht`, or a still-due password change).
 *
 * The e-mail method needs an address on the account; a user who has none yet adds it right here (`GET`/`PUT
 * /api/users/account`, which `MfaPendingFilter` lets such a session use for exactly this reason) instead of being
 * sent into "Mein Konto" to do it.
 */
@Component({
  selector: 'tafel-login-mfa-setup',
  templateUrl: 'login-mfa-setup.component.html',
  imports: [
    NgOptimizedImage,
    FormField,
    MatCard,
    MatCardContent,
    MatButton,
    MatDivider,
    MatFormField,
    MatInput,
    MatLabel,
    MatError
  ]
})
export class LoginMfaSetupComponent implements OnInit {
  private readonly mfaApiService = inject(MfaApiService);
  private readonly userApiService = inject(UserApiService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);

  private readonly qrContainer = viewChild<ElementRef<HTMLElement>>('qrContainer');
  private readonly banner = viewChild<ElementRef<HTMLElement>>('banner');

  /** Only a login that genuinely still owes a setup gets the wizard; anyone else is being sent on and never sees it flash by. */
  readonly setupOwed = signal(false);

  /** `null` until read. */
  status = signal<MfaStatus | null>(null);
  account = signal<UserAccountData | null>(null);
  /** Set between "Einrichten" and a code being accepted. */
  appSetup = signal<MfaSetup | null>(null);
  /** A code was sent to set the e-mail method up and has not been entered yet. */
  emailSetupStarted = signal(false);
  /** The account has no e-mail address yet and the user is entering one right here. */
  addingEmailAddress = signal(false);
  working = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  /** The secret in groups of four, which is how it is easiest to copy by eye. */
  readonly formattedSecret = computed(() => this.appSetup()?.secret.match(/.{1,4}/g)?.join(' ') ?? '');

  private readonly formModel = signal({appCode: '', emailCode: ''});
  codeForm = form(this.formModel, (schemaPath) => {
    validate(schemaPath.appCode, ({value}) => codeError(value()));
    validate(schemaPath.emailCode, ({value}) => codeError(value()));
  });

  private readonly emailAddressFormModel = signal({email: ''});
  emailAddressForm = form(this.emailAddressFormModel, (schemaPath) => {
    validate(schemaPath.email, ({value}) => value().trim().length === 0
      ? {kind: 'required', message: 'Bitte eine E-Mail-Adresse eingeben'}
      : null);
    validate(schemaPath.email, email({message: 'E-Mail-Format ungültig'}));
  });

  constructor() {
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

  async ngOnInit() {
    // Not logged in at all, or nothing owed (e.g. the page was opened by hand after a method was already set up).
    const userInfo = this.authenticationService.userInfo() ?? await this.authenticationService.loadUserInfo();
    if (userInfo === null) {
      this.authenticationService.redirectToLogin();
    } else if (this.authenticationService.isMfaPending()) {
      this.authenticationService.redirectToMfa();
    } else if (!this.authenticationService.isMfaSetupRequired()) {
      this.router.navigate(['uebersicht']);
    } else {
      this.setupOwed.set(true);
      this.loadStatus();
      this.loadAccount();
    }
  }

  private loadStatus() {
    this.mfaApiService.getStatus().subscribe(status => this.status.set(status));
  }

  private loadAccount() {
    this.userApiService.getAccount().subscribe(account => this.account.set(account));
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
    this.submitMethodCode('appCode', code => this.mfaApiService.enable(code, null, SUPPRESS_ERROR_TOAST_CONTEXT));
  }

  // ---- e-mail address (only asked for here when the account has none yet)

  startAddingEmailAddress() {
    this.addingEmailAddress.set(true);
    this.clearMessages();
    this.emailAddressFormModel.set({email: this.account()?.email ?? ''});
  }

  cancelAddingEmailAddress() {
    this.addingEmailAddress.set(false);
    this.clearMessages();
  }

  saveEmailAddress(event: Event) {
    event.preventDefault();
    this.emailAddressForm().markAsTouched();
    if (!this.emailAddressForm().valid()) {
      return;
    }
    const account = this.account();
    if (!account) {
      return;
    }

    this.working.set(true);
    this.clearMessages();
    this.userApiService.updateAccount({
      firstname: account.firstname,
      lastname: account.lastname,
      email: this.emailAddressForm.email().value().trim()
    }, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: updatedAccount => {
        this.account.set(updatedAccount);
        this.status.update(status => status ? {...status, emailAddress: updatedAccount.email} : status);
        this.addingEmailAddress.set(false);
        this.working.set(false);
        // The address is what a code goes to - send the first one right away instead of asking for another click.
        this.startEmailSetup();
      },
      error: (error: HttpErrorResponse) => this.fail(error)
    });
  }

  // ---- e-mail method

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
    this.submitMethodCode('emailCode', code => this.mfaApiService.enableEmail(code, null, SUPPRESS_ERROR_TOAST_CONTEXT));
  }

  // ---- shared

  private submitMethodCode(field: 'appCode' | 'emailCode', call: (code: string) => ReturnType<MfaApiService['enable']>) {
    this.codeForm[field]().markAsTouched();
    if (!this.codeForm[field]().valid()) {
      return;
    }

    this.working.set(true);
    this.clearMessages();
    call(this.codeForm[field]().value().replace(/\s/g, '')).subscribe({
      next: async () => {
        // The answer replaced the session cookie - the login is complete now that a method is set up, so what the
        // session may do is read again and the flow continues exactly where a plain login would have.
        await this.authenticationService.loadUserInfo();
        this.working.set(false);
        await this.router.navigate([this.authenticationService.passwordChangeRequired() ? '/login/passwortaendern' : 'uebersicht']);
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
    this.formModel.set({appCode: '', emailCode: ''});
  }

  /** A password-only session is live on the server - a plain navigate would leave it standing, so this goes through
   * the real logout, which also redirects. */
  cancel() {
    this.authenticationService.logout().subscribe();
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
