import {Component, computed, inject, viewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../../../../common/views/passwordchange-form/passwordchange-form.component';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

/** The "Passwort" tab of "Mein Konto". */
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

  private readonly toastr = inject(TafelToastrService);

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
        // Changing one's own password does not end the session, which is not obvious - and the fields are
        // emptied right away so the passwords do not stay on screen, so the toast is what carries the outcome.
        this.toastr.success('Sie bleiben mit dem neuen Passwort angemeldet.', 'Passwort geändert');
        this.form()?.reset();
      },
      // The form renders the server's rejection itself - nothing to add here, the handler only
      // keeps the failure from surfacing as an unhandled error.
      error: () => undefined
    });
  }

}
