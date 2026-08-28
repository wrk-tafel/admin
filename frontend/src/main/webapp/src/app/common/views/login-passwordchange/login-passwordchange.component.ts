import {Component, computed, inject, signal, viewChild} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {Router} from '@angular/router';
import {AuthenticationService, LoginResult} from '../../security/authentication.service';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatProgressBar} from '@angular/material/progress-bar';

@Component({
  selector: 'tafel-login-passwordchange',
  templateUrl: 'login-passwordchange.component.html',
  imports: [
    NgOptimizedImage,
    PasswordChangeFormComponent,
    MatCard,
    MatCardContent,
    MatButton,
    MatProgressBar,
  ]
})
export class LoginPasswordChangeComponent {
  form = viewChild(PasswordChangeFormComponent);

  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  /**
   * Set once the new password is saved and the silent re-login kicks off, so the brief pause
   * before the redirect to /uebersicht reads as progress rather than a hang (see #3209).
   */
  reLoginInProgress = signal(false);

  // Use signal from child component for reactive form validity
  saveDisabled = computed(() => {
    if (this.reLoginInProgress()) {
      return true;
    }
    const formComponent = this.form();
    if (!formComponent) {
      return true;
    }
    // Check form validity using signal forms API
    return !formComponent.passwordForm().valid();
  });

  changePassword() {
    const formComponent = this.form();
    if (!formComponent) {
      return;
    }

    formComponent.changePassword().subscribe({
      next: () => {
        this.reLoginInProgress.set(true);
        const username = this.authenticationService.getUsername()!;
        const password = formComponent.passwordForm.newPassword().value();
        this.authenticationService.login(username, password).then((result: LoginResult) => {
          if (result.successful) {
            this.router.navigate(['uebersicht']);
          } else {
            // Unexpected: re-login with the password that was just saved failed. Fall back to
            // letting the user retry by hand rather than leaving the page stuck "in progress".
            this.reLoginInProgress.set(false);
          }
        });
      },
      // The form renders the server's rejection itself (errorMessage/errorMessageDetails) -
      // nothing to add here, the handler only keeps the failure from surfacing as an unhandled
      // error (changePassword() rejects rather than resolving to false on failure).
      error: () => undefined
    });
  }

  cancel() {
    // Reaching this screen means the user already authenticated successfully (just with
    // passwordChangeRequired) - a plain navigate would leave that session live while the UI
    // looks logged out, so go through the real logout (which also redirects) instead, same as
    // the header's logout button.
    this.authenticationService.logout().subscribe();
  }

}
