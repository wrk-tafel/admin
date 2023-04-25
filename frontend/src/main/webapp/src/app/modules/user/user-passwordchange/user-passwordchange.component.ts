import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../../../common/views/passwordchange-form/passwordchange-form.component';
import {Router} from "@angular/router";

@Component({
  selector: 'tafel-user-passwordchange',
  templateUrl: 'user-passwordchange.component.html'
})
export class UserPasswordChangeComponent {
  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  constructor(private router: Router) {
  }

  changePassword() {
    this.form.changePassword().subscribe();
  }

  isSaveDisabled(): Boolean {
    return !this.form?.form.valid;
  }

}
