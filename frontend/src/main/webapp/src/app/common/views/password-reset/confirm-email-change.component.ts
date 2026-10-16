import {Component, inject, signal} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {PasswordResetApiService} from '../../../api/password-reset-api.service';
import {expectedErrorContext} from '../../http/suppress-client-log-record.token';

type ConfirmState = 'ready' | 'done' | 'invalidLink' | 'failed';

/**
 * Confirms a changed e-mail address with the link mailed to the previous address. The token sits in
 * the URL fragment, like the password reset's. Nothing happens when the page loads (mail scanners
 * open links); only the button sends it.
 */
@Component({
  selector: 'tafel-confirm-email-change',
  templateUrl: 'confirm-email-change.component.html',
  imports: [NgOptimizedImage, RouterLink, MatCard, MatCardContent, MatButton]
})
export class ConfirmEmailChangeComponent {
  private readonly passwordResetApiService = inject(PasswordResetApiService);
  private readonly route = inject(ActivatedRoute);

  readonly token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token');
  readonly state = signal<ConfirmState>(this.token ? 'ready' : 'invalidLink');
  readonly submitting = signal(false);

  confirm() {
    if (!this.token || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.passwordResetApiService.confirmEmailChange(this.token, expectedErrorContext(410)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.state.set('done');
      },
      error: (error: {status?: number}) => {
        this.submitting.set(false);
        this.state.set(error.status === 410 ? 'invalidLink' : 'failed');
      }
    });
  }
}
