import {Component, computed, inject, viewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {Router} from '@angular/router';
import {AuthenticationService, LoginResult} from '../../security/authentication.service';
import {MatCard, MatCardContent} from "@angular/material/card";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'tafel-login-passwordchange',
  templateUrl: 'login-passwordchange.component.html',
  imports: [
    PasswordChangeFormComponent,
    MatCard,
    MatCardContent,
    MatButton,
  ]
})
export class LoginPasswordChangeComponent {
  form = viewChild(PasswordChangeFormComponent);

  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  // Use signal from child component for reactive form validity
  saveDisabled = computed(() => {
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

    formComponent.changePassword().subscribe(successful => {
      if (successful) {
        const username = this.authenticationService.getUsername();
        const password = formComponent.passwordForm.newPassword().value();
        this.authenticationService.login(username, password).then((result: LoginResult) => {
          if (result.successful) {
            this.router.navigate(['uebersicht']);
          }
        });
      }
    });
  }

  cancel() {
    this.router.navigate(['login']);
  }

}
