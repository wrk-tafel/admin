import {NgOptimizedImage} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {extractErrorMessage} from '../../api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../http/suppress-error-toast.token';
import {AuthenticationService} from '../../security/authentication.service';
import {visibleErrorMessages} from '../../util/signal-form-helper';
import {MfaApiService} from '../../../api/mfa-api.service';

/**
 * The second step of a login for a user who has two-factor authentication switched on: the password
 * was right, a code is still owed - from the authenticator app, or the one sent by e-mail, whichever methods
 * the user has (a user with only the e-mail method gets it sent as this page opens). The session the password step left
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

  async ngOnInit() {
    // Not logged in at all, or nothing owed (e.g. the page was opened by hand after the code was accepted).
    const userInfo = this.authenticationService.userInfo() ?? await this.authenticationService.loadUserInfo();
    if (userInfo === null) {
      this.authenticationService.redirectToLogin();
    } else if (!this.authenticationService.isMfaPending()) {
      this.router.navigate(['uebersicht']);
    } else {
      this.codeOwed.set(true);
      if (this.hasEmail() && !this.hasApp()) {
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
    this.mfaApiService.verify(this.codeForm.code().value().replace(/\s/g, ''), SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: async () => {
        // The answer replaced the session cookie - what the session may do is read again, now that
        // the code was accepted.
        await this.authenticationService.loadUserInfo();
        this.submitting.set(false);
        await this.router.navigate([this.authenticationService.passwordChangeRequired() ? '/login/passwortaendern' : 'uebersicht']);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.status === 429
          ? 'Zu viele Anfragen! Bitte warten Sie einen Moment und versuchen Sie es erneut.'
          : extractErrorMessage(error));
        this.formModel.set({code: ''});
        this.submitting.set(false);
      }
    });
  }

  cancel() {
    // A password-only session is live on the server - a plain navigate would leave it standing while the
    // UI looks logged out, so go through the real logout, which also redirects.
    this.authenticationService.logout().subscribe();
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
