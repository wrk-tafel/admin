import {Component, inject, signal} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {RouterLink} from '@angular/router';
import {form, FormField, required} from '@angular/forms/signals';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {PasswordResetApiService} from '../../../api/password-reset-api.service';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../http/suppress-error-toast.token';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {visibleErrorMessages} from '../../util/signal-form-helper';

/**
 * "Passwort vergessen?" - asks for a link by username or e-mail address. The answer is the same
 * whether an account was found or not (the backend says nothing either way), so the page only ever
 * says what happens *if* one exists.
 */
@Component({
  selector: 'tafel-forgot-password',
  templateUrl: 'forgot-password.component.html',
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
export class ForgotPasswordComponent {
  private readonly passwordResetApiService = inject(PasswordResetApiService);

  readonly model = signal({identifier: ''});
  readonly requestForm = form(this.model, (schemaPath) => {
    required(schemaPath.identifier, {message: 'Bitte Benutzername oder E-Mail-Adresse eingeben'});
  });

  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly failed = signal(false);

  onSubmit(event: Event) {
    event.preventDefault();
    this.requestForm().markAsTouched();
    if (!this.requestForm().valid() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.failed.set(false);
    this.passwordResetApiService.requestReset(this.model().identifier.trim(), SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.failed.set(true);
      }
    });
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
