import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../../../../common/views/passwordchange-form/passwordchange-form.component';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';

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
  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  changePassword() {
    this.form.changePassword().subscribe();
  }

  isSaveDisabled(): boolean {
    return !this.form?.passwordForm().valid();
  }

}
