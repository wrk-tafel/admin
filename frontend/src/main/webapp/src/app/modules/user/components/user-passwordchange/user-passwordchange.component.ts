import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../../../../common/views/passwordchange-form/passwordchange-form.component';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent
} from '@coreui/angular';

@Component({
    selector: 'tafel-user-passwordchange',
    templateUrl: 'user-passwordchange.component.html',
    imports: [
        CardComponent,
        CardHeaderComponent,
        CardBodyComponent,
        PasswordChangeFormComponent,
        CardFooterComponent,
        ButtonDirective
    ]
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
