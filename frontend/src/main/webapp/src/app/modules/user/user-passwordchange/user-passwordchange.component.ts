import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../../../common/views/passwordchange-form/passwordchange-form.component';

@Component({
  selector: 'tafel-user-passwordchange',
  templateUrl: 'user-passwordchange.component.html'
})
export class UserPasswordChangeComponent {
  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  changePassword() {
    this.form.changePassword().subscribe();
  }

  isSaveDisabled(): boolean {
    return !this.form?.form.valid;
  }

}
