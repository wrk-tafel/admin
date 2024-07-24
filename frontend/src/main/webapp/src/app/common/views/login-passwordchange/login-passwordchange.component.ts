import {Component, inject, ViewChild} from '@angular/core';
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
import {NgOptimizedImage} from "@angular/common";

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
  ],
  standalone: true
})
export class LoginPasswordChangeComponent {
  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;
  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  changePassword() {
    this.form.changePassword().subscribe(successful => {
      if (successful) {
        const username = this.authenticationService.getUsername();
        const password = this.form.newPassword.value;
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

  isSaveDisabled(): boolean {
    return !this.form?.isValid();
  }

}
