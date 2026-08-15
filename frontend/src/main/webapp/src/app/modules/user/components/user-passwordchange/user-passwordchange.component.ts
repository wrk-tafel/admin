import {Component, computed, inject, viewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../../../../common/views/passwordchange-form/passwordchange-form.component';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {Router} from '@angular/router';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

const FALLBACK_RETURN_URL = '/uebersicht';

@Component({
  selector: 'tafel-user-passwordchange',
  templateUrl: 'user-passwordchange.component.html',
  imports: [
    PasswordChangeFormComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardActions,
    MatButton
  ]
})
export class UserPasswordChangeComponent {
  form = viewChild(PasswordChangeFormComponent);

  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);

  /**
   * The page is opened from the user menu on top of whatever screen the user was working on, so
   * both "Abbrechen" and a finished change return there. Captured while this component is being
   * activated - afterwards the navigation this page came from is no longer the current one. A page
   * opened directly by its URL has no previous screen in this application, hence the fallback.
   */
  private readonly returnUrl = this.router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString()
    ?? FALLBACK_RETURN_URL;

  saveDisabled = computed(() => {
    const formComponent = this.form();
    if (!formComponent) {
      return true;
    }
    return !formComponent.passwordForm().valid();
  });

  changePassword() {
    this.form()?.changePassword().subscribe({
      next: () => {
        // Changing one's own password does not end the session, which is not obvious - and since
        // the user is sent back to where they came from, the form's own success banner is gone by
        // then, so the toast is what carries the outcome.
        this.toastr.success('Sie bleiben mit dem neuen Passwort angemeldet.', 'Passwort geändert');
        this.router.navigateByUrl(this.returnUrl);
      },
      // The form renders the server's rejection itself - nothing to add here, the handler only
      // keeps the failure from surfacing as an unhandled error.
      error: () => undefined
    });
  }

  cancel() {
    this.router.navigateByUrl(this.returnUrl);
  }

}
