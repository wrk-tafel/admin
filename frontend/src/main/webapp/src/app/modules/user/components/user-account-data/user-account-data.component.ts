import {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, inject, signal} from '@angular/core';
import {form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MfaApiService} from '../../../../api/mfa-api.service';
import {UserAccountData, UserAccountRequest, UserApiService} from '../../../../api/user-api.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {email} from '../../../../common/validator/signal-form-validators';

/**
 * The "Meine Daten" tab of "Mein Konto": the user's own account, and the part of it that is theirs to change - the
 * name and the e-mail address. The username and the personnel number are shown but not editable: an administrator
 * assigns them (see `UserFormComponent`), and the backend accepts nothing else from this tab either.
 *
 * The e-mail address is what the two-factor authentication's code by e-mail goes to, which is why the two-factor tab
 * sends a user here when none is on record. While that method is on, changing the address takes a code of a method
 * the user has (`mfaCode`) - otherwise a browser left signed in could redirect every future code.
 */
@Component({
  selector: 'tafel-user-account-data',
  templateUrl: 'user-account-data.component.html',
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    MatError,
    MatButton
  ]
})
export class UserAccountDataComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly mfaApiService = inject(MfaApiService);
  private readonly toastr = inject(TafelToastrService);

  /** `null` until the account has been read. */
  account = signal<UserAccountData | null>(null);
  working = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  private readonly formModel = signal({firstname: '', lastname: '', email: '', mfaCode: ''});

  /** The address is a second factor and is about to change, so the change has to be vouched for with a code. */
  readonly codeRequired = computed(() => {
    const account = this.account();
    return !!account && account.mfaEmailEnabled && (this.formModel().email.trim() || null) !== (account.email ?? null);
  });

  accountForm = form(this.formModel, (schemaPath) => {
    required(schemaPath.firstname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.firstname, 50, {message: 'Vorname zu lang (maximal 50 Zeichen)'});

    required(schemaPath.lastname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.lastname, 50, {message: 'Nachname zu lang (maximal 50 Zeichen)'});

    maxLength(schemaPath.email, 255, {message: 'E-Mail-Adresse zu lang (maximal 255 Zeichen)'});
    validate(schemaPath.email, email({message: 'E-Mail-Format ungültig'}));

    validate(schemaPath.mfaCode, ({value}) => {
      if (!this.codeRequired()) {
        return null;
      }
      const code = value().replace(/\s/g, '');
      if (code.length === 0) {
        return {kind: 'required', message: 'Bitte den Code eingeben'};
      }
      return /^\d{6}$/.test(code) ? null : {kind: 'codeFormat', message: 'Der Code besteht aus 6 Ziffern'};
    });
  });

  /** What the form would send, trimmed the way the backend stores it. */
  private readonly request = computed<UserAccountRequest>(() => {
    const value = this.formModel();
    return {
      firstname: value.firstname.trim(),
      lastname: value.lastname.trim(),
      email: value.email.trim() || null,
      ...(this.codeRequired() ? {mfaCode: value.mfaCode.replace(/\s/g, '')} : {})
    };
  });

  /** Whether anything differs from what is saved - nothing to save (or discard) otherwise. */
  readonly changed = computed(() => {
    const account = this.account();
    if (!account) {
      return false;
    }
    const request = this.request();
    return request.firstname !== account.firstname
      || request.lastname !== account.lastname
      || request.email !== (account.email ?? null);
  });

  constructor() {
    this.userApiService.getAccount().subscribe(account => this.show(account));
  }

  save(event: Event) {
    event.preventDefault();
    this.accountForm().markAsTouched();
    if (!this.accountForm().valid() || !this.changed()) {
      return;
    }

    this.working.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.userApiService.updateAccount(this.request(), SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: (account) => {
        this.show(account);
        this.working.set(false);
        this.toastr.success('Daten gespeichert!');
      },
      error: (error: HttpErrorResponse) => {
        this.working.set(false);
        this.errorMessage.set(extractErrorMessage(error));
        // a code is good once - whatever was typed is spent
        this.formModel.update(value => ({...value, mfaCode: ''}));
      }
    });
  }

  /** Sends the e-mailed code - to the address on record, not the one being typed - for a user who has that method. */
  sendCode() {
    this.working.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.mfaApiService.sendEmailCode(SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.infoMessage.set('Ein Code wurde an Ihre bisherige E-Mail-Adresse gesendet.');
        this.working.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.working.set(false);
        this.errorMessage.set(error.status === 429
          ? 'Bitte einen Moment warten, bevor ein neuer Code angefordert wird!'
          : extractErrorMessage(error));
      }
    });
  }

  /** Back to what is saved. */
  discard() {
    const account = this.account();
    if (account) {
      this.show(account);
    }
  }

  private show(account: UserAccountData) {
    this.account.set(account);
    this.infoMessage.set(null);
    this.formModel.set({firstname: account.firstname, lastname: account.lastname, email: account.email ?? '', mfaCode: ''});
    this.accountForm().reset();
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
