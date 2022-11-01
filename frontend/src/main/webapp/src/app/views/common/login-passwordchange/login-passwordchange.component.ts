import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from "../../user/views/passwordchange-form/passwordchange-form.component";
import {Router} from "@angular/router";

@Component({
  selector: 'tafel-login-passwordchange',
  templateUrl: 'login-passwordchange.component.html'
})
export class LoginPasswordChangeComponent {
  constructor(
    private router: Router
  ) {
  }

  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  changePassword() {
    this.form.changePassword().subscribe(successful => {
      if (successful) {
        // TODO
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
