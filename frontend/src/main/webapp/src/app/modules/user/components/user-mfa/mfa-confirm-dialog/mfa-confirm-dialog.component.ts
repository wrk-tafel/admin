import {HttpErrorResponse} from '@angular/common/http';
import {Component, inject, signal} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {firstValueFrom} from 'rxjs';
import {extractErrorMessage} from '../../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../../common/http/suppress-error-toast.token';
import {visibleErrorMessages} from '../../../../../common/util/signal-form-helper';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {PasskeyService} from '../../../../../common/security/passkey.service';
import {MfaApiService, MfaProof} from '../../../../../api/mfa-api.service';
import {mfaCodeError} from '../mfa-code';

export interface MfaConfirmDialogData {
  /** What is being confirmed, e.g. "Authenticator-App entfernen". */
  title: string;
  /** The label of the confirming button. */
  confirmLabel: string;
  /** A removal - the dialog and its button look like one. */
  danger?: boolean;
  /** Which methods the user has, so the dialog asks for the right proof. */
  totpEnabled: boolean;
  emailEnabled: boolean;
  /** Runs the change with the proof. A refusal keeps the dialog open and shows its message. */
  change: (proof: MfaProof) => Promise<void>;
  /** What is shown when the browser's passkey prompt fails or is dismissed during the change. */
  promptError?: string;
  /**
   * The change also carries a code typed on the page, which the backend refuses with the same answer as a wrong
   * proof. Another try in here could never fix that one, so a refusal closes the dialog and hands it to the page.
   */
  closeOnRefusal?: boolean;
}

/** `true` once the change went through, the backend's refusal for `closeOnRefusal`, nothing when backed out of. */
export type MfaConfirmDialogResult = true | HttpErrorResponse | undefined;

const DEFAULT_PROMPT_ERROR = 'Die Bestätigung mit dem Passkey wurde abgebrochen oder ist nicht möglich - bitte erneut versuchen.';

/**
 * "Bestehende Methode bestätigen": the proof of a method the user already has, which adding or removing a method
 * or a passkey takes (ADR-0059). While the app or the e-mail code is on, it asks for a code - and offers to send
 * one by e-mail while that method is on. A user who has nothing but passkeys confirms with one of them instead,
 * which the browser asks for.
 *
 * The dialog runs the change itself (`change`) rather than handing the proof back, so a wrong code is answered
 * where it was typed, and the dialog stays open for another try - unless `closeOnRefusal` says the refusal may be
 * about a code on the page. It closes with `true` once the change went through and without a result when the user
 * backs out.
 */
@Component({
  selector: 'tafel-mfa-confirm-dialog',
  templateUrl: 'mfa-confirm-dialog.component.html',
  imports: [TafelDialogComponent, FormField, MatButton, MatFormField, MatInput, MatLabel, MatError]
})
export class MfaConfirmDialogComponent {
  readonly data: MfaConfirmDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MfaConfirmDialogComponent>);
  private readonly mfaApiService = inject(MfaApiService);
  private readonly passkeyService = inject(PasskeyService);

  /** The app or the e-mail code is on, so the proof is a code; otherwise it is one of the user's passkeys. */
  readonly withCode = this.data.totpEnabled || this.data.emailEnabled;
  /** Where that code comes from. */
  readonly codeSource = this.data.totpEnabled && this.data.emailEnabled
    ? 'aus der Authenticator-App oder per E-Mail'
    : this.data.totpEnabled ? 'aus der Authenticator-App' : 'er wird per E-Mail gesendet';

  working = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  private readonly model = signal({code: ''});
  codeForm = form(this.model, (schemaPath) => {
    validate(schemaPath.code, ({value}) => this.withCode ? mfaCodeError(value()) : null);
  });

  sendCode() {
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

  async confirm(event: Event) {
    event.preventDefault();
    if (this.withCode) {
      this.codeForm.code().markAsTouched();
      if (!this.codeForm.code().valid()) {
        return;
      }
    }

    this.working.set(true);
    this.clearMessages();
    try {
      await this.data.change(await this.proof());
      this.dialogRef.close(true);
    } catch (error) {
      // What the browser's passkey prompt throws is an Error; a refusal by the backend is not.
      if (error instanceof Error) {
        this.errorMessage.set(this.data.promptError ?? DEFAULT_PROMPT_ERROR);
        this.working.set(false);
      } else if (this.data.closeOnRefusal) {
        this.dialogRef.close(error as HttpErrorResponse);
      } else {
        this.fail(error as HttpErrorResponse);
      }
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  private async proof(): Promise<MfaProof> {
    if (this.withCode) {
      return {code: this.model().code.replace(/\s/g, '')};
    }
    const {options} = await firstValueFrom(this.mfaApiService.passkeyOptions(SUPPRESS_ERROR_TOAST_CONTEXT));
    return {credential: await this.passkeyService.get(options)};
  }

  private fail(error: HttpErrorResponse) {
    this.errorMessage.set(error.status === 429
      ? 'Bitte einen Moment warten, bevor ein neuer Code angefordert wird!'
      : extractErrorMessage(error));
    // a code is good for one try, so the next one starts from an empty field
    this.model.set({code: ''});
    this.codeForm.code().reset();
    this.working.set(false);
  }

  private clearMessages() {
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
