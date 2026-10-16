import {Component, inject, signal} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {form, FormField, maxLength, minLength, required, validate} from '@angular/forms/signals';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {PasswordResetApiService, PasswordResetConfirmResponse} from '../../../api/password-reset-api.service';
import {expectedErrorContext} from '../../http/suppress-client-log-record.token';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {visibleErrorMessages} from '../../util/signal-form-helper';

type ResetState = 'form' | 'done' | 'invalidLink';

/**
 * Sets a new password with the link from a "Passwort vergessen?" mail. The token sits in the URL
 * fragment (`#token=...`), which browsers never send to the server, so it stays out of every log.
 *
 * Nothing happens when the page loads: mail scanners and link previews open links, and a token used
 * up by one of them would leave the real user with a dead link. Only the button sends it.
 */
@Component({
  selector: 'tafel-reset-password',
  templateUrl: 'reset-password.component.html',
  imports: [
    NgOptimizedImage,
    RouterLink,
    FormField,
    MatCard,
    MatCardContent,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    TafelAutofocusDirective
  ]
})
export class ResetPasswordComponent {
  private readonly passwordResetApiService = inject(PasswordResetApiService);
  private readonly route = inject(ActivatedRoute);

  readonly token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token');

  readonly model = signal({newPassword: '', newRepeatedPassword: ''});
  readonly resetForm = form(this.model, (schemaPath) => {
    required(schemaPath.newPassword, {message: 'Pflichtfeld'});
    minLength(schemaPath.newPassword, 8, {message: 'Passwort zu kurz (Limit: 8)'});
    maxLength(schemaPath.newPassword, 50, {message: 'Passwort zu lang (Limit: 50)'});
    required(schemaPath.newRepeatedPassword, {message: 'Pflichtfeld'});
    validate(schemaPath.newRepeatedPassword, ({value, valueOf}) =>
      value() !== valueOf(schemaPath.newPassword)
        ? {kind: 'passwordsDontMatch', message: 'Passwort-Wiederholung stimmt nicht überein!'}
        : null
    );
  });

  readonly state = signal<ResetState>(this.token ? 'form' : 'invalidLink');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly errorMessageDetails = signal<string[]>([]);

  onSubmit(event: Event) {
    event.preventDefault();
    this.resetForm().markAsTouched();
    if (!this.token || !this.resetForm().valid() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.errorMessageDetails.set([]);
    this.passwordResetApiService.confirmReset(this.token, this.model().newPassword, expectedErrorContext(400, 410)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.state.set('done');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        if (error.status === 410) {
          this.state.set('invalidLink');
          return;
        }
        const body = error.error as PasswordResetConfirmResponse | null | undefined;
        this.errorMessage.set(body?.message ?? 'Das Passwort konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
        this.errorMessageDetails.set(body?.details ?? []);
      }
    });
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
