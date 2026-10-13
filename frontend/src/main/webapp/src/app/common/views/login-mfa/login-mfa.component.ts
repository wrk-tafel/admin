import {NgOptimizedImage} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {extractErrorMessage} from '../../api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../http/suppress-error-toast.token';
import {expectedErrorContext} from '../../http/suppress-client-log-record.token';
import {AuthenticationService} from '../../security/authentication.service';
import {visibleErrorMessages} from '../../util/signal-form-helper';
import {MfaApiService} from '../../../api/mfa-api.service';
import {PasskeyService} from '../../security/passkey.service';

/**
 * The second step of a login for a user who has two-factor authentication switched on: the password
 * was right, a code is still owed - from the authenticator app, or the one sent by e-mail, whichever methods
 * the user has (a user with only the e-mail method gets it sent as this page opens). A user who has a passkey, on
 * a browser that can use one, is offered that first: it takes the place of the code, and the code form stays below
 * it as the way in when the passkey is not at hand. The session the password step left
 * behind does nothing until this page has handed the code in (the backend refuses everything else),
 * so anyone who lands here without such a session is sent on to where they belong.
 */
@Component({
  selector: 'tafel-login-mfa',
  templateUrl: 'login-mfa.component.html',
  imports: [
    NgOptimizedImage,
    FormField,
    TafelAutofocusDirective,
    MatCard,
    MatCardContent,
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    MatError
  ]
})
export class LoginMfaComponent implements OnInit {
  private readonly mfaApiService = inject(MfaApiService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly passkeyService = inject(PasskeyService);
  private readonly router = inject(Router);

  private readonly formModel = signal({code: ''});
  codeForm = form(this.formModel, (schemaPath) => {
    validate(schemaPath.code, ({value}) => {
      const code = value().replace(/\s/g, '');
      if (code.length === 0) {
        return {kind: 'required', message: 'Bitte den Code eingeben'};
      }
      return /^\d{6}$/.test(code) ? null : {kind: 'codeFormat', message: 'Der Code besteht aus 6 Ziffern'};
    });
  });

  /** Only a login that owes its code gets the form; anyone else is being sent on and never sees it flash by. */
  readonly codeOwed = signal(false);
  submitting = signal(false);
  sendingCode = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  readonly hasApp = computed(() => this.authenticationService.mfaMethods().includes('TOTP'));
  readonly hasEmail = computed(() => this.authenticationService.mfaMethods().includes('EMAIL'));
  readonly hasCode = computed(() => this.hasApp() || this.hasEmail());
  /** A passkey is only offered where the browser can use one - elsewhere the page is what it is without. */
  readonly hasPasskey = computed(() => this.authenticationService.mfaMethods().includes('PASSKEY') && this.passkeyService.isSupported());
  /** A passkey is all the account has and this browser cannot use one - nothing on this page completes the login. */
  readonly noWayIn = computed(() => !this.hasCode() && !this.hasPasskey());

  async ngOnInit() {
    // Not logged in at all, or nothing owed (e.g. the page was opened by hand after the code was accepted).
    const userInfo = this.authenticationService.userInfo() ?? await this.authenticationService.loadUserInfo();
    if (userInfo === null) {
      this.authenticationService.redirectToLogin();
    } else if (!this.authenticationService.isMfaPending()) {
      this.router.navigate(['uebersicht']);
    } else {
      this.codeOwed.set(true);
      if (this.hasEmail() && !this.hasApp() && !this.hasPasskey()) {
        // The e-mailed code is the only way in, so it is sent without waiting to be asked. A code that was
        // sent a moment ago (the page was reloaded) is still good, hence a refusal here is not an error.
        this.sendEmailCode(true);
      }
    }
  }

  /** Sends the e-mailed code; [quiet] keeps a cooldown refusal from being shown as an error. */
  sendEmailCode(quiet = false) {
    this.sendingCode.set(true);
    this.errorMessage.set(null);
    this.mfaApiService.sendEmailCode(SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.infoMessage.set('Ein Code wurde an Ihre E-Mail-Adresse gesendet.');
        this.sendingCode.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 429) {
          this.infoMessage.set('Ein Code wurde bereits gesendet - bitte in Ihrem Postfach nachsehen.');
          if (!quiet) {
            this.errorMessage.set('Bitte einen Moment warten, bevor ein neuer Code angefordert wird!');
          }
        } else {
          this.errorMessage.set(extractErrorMessage(error));
        }
        this.sendingCode.set(false);
      }
    });
  }

  onSubmit(event: Event) {
    // Plain native <form> - see LoginComponent.onSubmit
    event.preventDefault();
    this.codeForm().markAsTouched();
    if (!this.codeForm().valid()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.mfaApiService.verify(this.codeForm.code().value().replace(/\s/g, ''), expectedErrorContext(400, 429)).subscribe({
      next: () => this.completeLogin(),
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.requestErrorMessage(error));
        this.formModel.set({code: ''});
        this.submitting.set(false);
      }
    });
  }

  /**
   * Completes the login with a passkey: the backend hands out a challenge, the authenticator signs it, and the
   * backend checks the signature. Whatever goes wrong leaves the page as it is, for another try or - if the
   * account has one - a code.
   */
  async usePasskey() {
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    try {
      const {options} = await firstValueFrom(this.mfaApiService.passkeyOptions(expectedErrorContext(400, 429)));
      const credential = await this.passkeyService.get(options);
      await firstValueFrom(this.mfaApiService.verifyPasskey(credential, expectedErrorContext(400, 429)));
      await this.completeLogin();
    } catch (error) {
      // Anything that is not an answer of the backend came from the browser: the user dismissed the prompt, or
      // no passkey for this account is on the device.
      this.errorMessage.set(error instanceof HttpErrorResponse
        ? this.requestErrorMessage(error)
        : 'Die Bestätigung mit dem Passkey wurde abgebrochen oder ist nicht möglich - bitte erneut versuchen'
          + (this.hasCode() ? ' oder den Code verwenden.' : '.'));
      this.submitting.set(false);
    }
  }

  private async completeLogin() {
    // The answer replaced the session cookie - what the session may do is read again, now that
    // the second step was accepted.
    await this.authenticationService.loadUserInfo();
    this.submitting.set(false);
    await this.router.navigate([this.authenticationService.passwordChangeRequired() ? '/login/passwortaendern' : 'uebersicht']);
  }

  private requestErrorMessage(error: HttpErrorResponse): string {
    return error.status === 429
      ? 'Zu viele Anfragen! Bitte warten Sie einen Moment und versuchen Sie es erneut.'
      : extractErrorMessage(error);
  }

  cancel() {
    // A password-only session is live on the server - a plain navigate would leave it standing while the
    // UI looks logged out, so go through the real logout, which also redirects.
    this.authenticationService.logout().subscribe();
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
