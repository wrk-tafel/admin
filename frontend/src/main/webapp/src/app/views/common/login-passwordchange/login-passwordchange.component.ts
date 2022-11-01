import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from "../../user/views/passwordchange-form/passwordchange-form.component";
import {Router} from "@angular/router";
import {AuthenticationService, LoginResult} from "../../../common/security/authentication.service";

@Component({
  selector: 'tafel-login-passwordchange',
  templateUrl: 'login-passwordchange.component.html'
})
export class LoginPasswordChangeComponent {
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {
  }

  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  changePassword() {
    this.form.changePassword().subscribe(successful => {
      if (successful) {
        const username = this.authService.getUsername();
        const password = this.form.newPassword.value
        this.authService.login(username, password).then((result: LoginResult) => {
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

  isSaveDisabled(): Boolean {
    return !this.form?.form.valid;
  }

}
