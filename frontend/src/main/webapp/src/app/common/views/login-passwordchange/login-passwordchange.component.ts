import {Component, computed, effect, inject, signal, viewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {Router} from '@angular/router';
import {AuthenticationService, LoginResult} from '../../security/authentication.service';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardGroupComponent,
  ColComponent,
  ContainerComponent,
  RowComponent
} from '@coreui/angular';
import {NgOptimizedImage} from '@angular/common';

@Component({
    selector: 'tafel-login-passwordchange',
    templateUrl: 'login-passwordchange.component.html',
    imports: [
        ContainerComponent,
        RowComponent,
        ColComponent,
        CardGroupComponent,
        CardComponent,
        CardBodyComponent,
        PasswordChangeFormComponent,
        ButtonDirective,
        NgOptimizedImage
    ]
})
export class LoginPasswordChangeComponent {
  form = viewChild(PasswordChangeFormComponent);
  private formValid = signal(false);

  saveDisabled = computed(() => {
    const formComponent = this.form();
    if (!formComponent) {
      return true;
    }
    return !this.formValid();
  });

  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const formComponent = this.form();
      if (formComponent) {
        // Subscribe to form status changes
        formComponent.form.statusChanges.subscribe(() => {
          this.formValid.set(formComponent.isValid());
        });
        // Set initial validity
        this.formValid.set(formComponent.isValid());
      }
    });
  }

  changePassword() {
    const formComponent = this.form();
    if (!formComponent) {
      return;
    }

    formComponent.changePassword().subscribe(successful => {
      if (successful) {
        const username = this.authenticationService.getUsername();
        const password = formComponent.newPassword.value;
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
