import {Component, ViewChild} from '@angular/core';
import {ModalDirective} from "ngx-bootstrap/modal";
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {UserApiService} from "../../common/api/user-api.service";

const validateNewAndRepeatedPasswords: ValidatorFn = (formGroup: FormGroup) => {
  const newPassword = formGroup.get('newPassword').value;
  const newRepeatedPassword = formGroup.get('newRepeatedPassword').value;

  console.log("VAL", newPassword, newRepeatedPassword);

  if (newPassword != newRepeatedPassword) {
    console.log("DONT MATCH!");
    return {passwordsDontMatch: true};
  }

  console.log("MATCH!");
  return null;
}

@Component({
  selector: 'tafel-passwordchange-modal',
  templateUrl: './passwordchange-modal.component.html'
})
export class PasswordChangeModalComponent {
  @ViewChild('pwdChangeModal') public modal: ModalDirective;

  constructor(
    private userApiService: UserApiService
  ) {
  }

  form = new FormGroup({
      currentPassword: new FormControl('', [Validators.required]),
      newPassword: new FormControl('', [Validators.required]),
      newRepeatedPassword: new FormControl('', [Validators.required])
    },
    {
      validators: [validateNewAndRepeatedPasswords],
      updateOn: 'change'
    }
  );

  public showDialog() {
    this.form.reset();
    this.modal.show();
  }

  public changePassword() {
    const currentPassword = this.currentPassword.value
    const newPassword = this.newPassword.value
    const newRepeatedPassword = this.newRepeatedPassword.value

    /*
    this.userApiService.updatePassword(
      {passwordCurrent: this.currentPassword.value, passwordNew: this.newPassword.value}
    )
     */

    console.log("FORM", this.form);

    // console.log("CHANGED: ", data);
    this.hideModalDelayed();
  }

  private hideModalDelayed() {
    const root = this;
    setTimeout(function () {
      root.modal.hide();
    }, 1500);
  }

  get currentPassword() {
    return this.form.get('currentPassword');
  }

  get newPassword() {
    return this.form.get('newPassword');
  }

  get newRepeatedPassword() {
    return this.form.get('newRepeatedPassword');
  }
}
