import {Component, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';

@Component({
  selector: 'tafel-passwordchange-modal',
  templateUrl: './passwordchange-modal.component.html'
})
export class PasswordChangeModalComponent {
  @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

  showPwdChangeModal: boolean = false;

  showDialog() {
    this.form.reset();
    this.showPwdChangeModal = true;
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
      this.showPwdChangeModal = false;
    }, 1500);
  }
}
