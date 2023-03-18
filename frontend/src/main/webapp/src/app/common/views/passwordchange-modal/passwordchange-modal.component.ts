import {Component, ViewChild} from '@angular/core';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';

@Component({
  selector: 'tafel-passwordchange-modal',
  templateUrl: './passwordchange-modal.component.html'
})
export class PasswordChangeModalComponent {
  @ViewChild('pwdChangeModal') public modal: ModalDirective;
  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  showDialog() {
    this.form.reset();
    this.modal.show();
  }

  changePassword() {
    this.form.changePassword().subscribe(successful => {
      if (successful) {
        this.hideModalDelayed();
      }
    });
  }

  isSaveDisabled(): Boolean {
    return !this.form?.form.valid;
  }

  hideModalDelayed() {
    const root = this;
    setTimeout(function () {
      root.modal.hide();
    }, 1500);
  }
}
