import {Component, ViewChild} from '@angular/core';
import {ModalDirective} from "ngx-bootstrap/modal";
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'tafel-passwordchange-modal',
  templateUrl: './passwordchange-modal.component.html'
})
export class PasswordChangeModalComponent {
  @ViewChild('pwdChangeModal') public modal: ModalDirective;

  form = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required]),
    newRepeatedPassword: new FormControl('', [Validators.required])
  });

  public showDialog() {
    this.form.markAsUntouched();
    this.modal.show();
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
