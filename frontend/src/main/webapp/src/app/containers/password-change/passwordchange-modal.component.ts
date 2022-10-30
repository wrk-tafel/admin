import {Component, ViewChild} from '@angular/core';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from '../../common/api/user-api.service';
import {HttpErrorResponse} from '@angular/common/http';

@Component({
  selector: 'tafel-passwordchange-modal',
  templateUrl: './passwordchange-modal.component.html'
})
export class PasswordChangeModalComponent {
  @ViewChild('pwdChangeModal') public modal: ModalDirective;
  successMessage: string;
  errorMessage: string;
  errorMessageDetails: string[];

  constructor(
    private userApiService: UserApiService
  ) {
  }

  validateNewAndRepeatedPasswords: ValidatorFn = (formGroup: FormGroup) => {
    const newPassword = formGroup.get('newPassword').value;
    const newRepeatedPassword = formGroup.get('newRepeatedPassword').value;

    if (newPassword !== newRepeatedPassword) {
      return {passwordsDontMatch: true};
    }

    return null;
  }

  form = new FormGroup({
      currentPassword: new FormControl('', [
        Validators.required
      ]),
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50)
      ]),
      newRepeatedPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50)
      ])
    },
    {
      validators: [this.validateNewAndRepeatedPasswords],
      updateOn: 'change'
    }
  );

  public showDialog() {
    this.form.reset();
    this.modal.show();
  }

  public changePassword() {
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;

    const passwordChangeRequest: ChangePasswordRequest = {passwordCurrent: currentPassword, passwordNew: newPassword};
    this.userApiService.updatePassword(passwordChangeRequest).subscribe(
      response => {
        this.errorMessage = null;
        this.errorMessageDetails = null;
        this.successMessage = 'Passwort erfolgreich geändert!';
        this.hideModalDelayed();
      },
      (error: HttpErrorResponse) => {
        const errorBody = error.error as ChangePasswordResponse;
        this.errorMessage = errorBody.message;
        this.errorMessageDetails = errorBody.details;
      }
    );
  }

  hideModalDelayed() {
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
