import {Component} from '@angular/core';
import {FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from '../../api/user-api.service';
import {HttpErrorResponse} from '@angular/common/http';
import {map} from "rxjs/operators";
import {Observable} from "rxjs";

@Component({
  selector: 'tafel-passwordchange-form',
  templateUrl: './passwordchange-form.component.html'
})
export class PasswordChangeFormComponent {
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

  public changePassword(): Observable<boolean> {
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;

    const passwordChangeRequest: ChangePasswordRequest = {passwordCurrent: currentPassword, passwordNew: newPassword};

    return this.userApiService.updatePassword(passwordChangeRequest).pipe(
      map(
        (response: ChangePasswordResponse) => {
          this.errorMessage = null;
          this.errorMessageDetails = null;
          this.successMessage = 'Passwort erfolgreich geändert!';
          return true;
        },
        (error: HttpErrorResponse) => {
          const errorBody = error.error as ChangePasswordResponse;
          this.errorMessage = errorBody.message;
          this.errorMessageDetails = errorBody.details;
          return false;
        }
      ));
  }

  reset() {
    this.successMessage = null;
    this.errorMessage = null;
    this.errorMessageDetails = null;
    this.form.reset();
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
