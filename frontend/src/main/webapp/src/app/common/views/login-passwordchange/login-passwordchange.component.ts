import {Component, computed, inject, viewChild} from '@angular/core';
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

  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  // Use signal from child component for reactive form validity
  saveDisabled = computed(() => {
    const formComponent = this.form();
    if (!formComponent) {
      return true;
    }
    // Use the formValid signal exposed by the child component
    return !formComponent.formValid();
  });

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
