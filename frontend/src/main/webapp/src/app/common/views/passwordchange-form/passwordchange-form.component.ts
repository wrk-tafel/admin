import {Component} from '@angular/core';
import {UntypedFormControl, UntypedFormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from '../../../api/user-api.service';
import {catchError, map} from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';

@Component({
  selector: 'tafel-passwordchange-form',
  templateUrl: './passwordchange-form.component.html'
})
export class PasswordChangeFormComponent {
  successMessage: string;
  errorMessage: string;
  errorMessageDetails: string[];

  form = new UntypedFormGroup({
      currentPassword: new UntypedFormControl('', [
        Validators.required
      ]),
      newPassword: new UntypedFormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50)
      ]),
      newRepeatedPassword: new UntypedFormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50)
      ])
    },
    {
      validators: [this.validateNewAndRepeatedPasswords()],
      updateOn: 'change'
    }
  );

  constructor(
    private userApiService: UserApiService
  ) {
  }

  changePassword(): Observable<boolean> {
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;

    const passwordChangeRequest: ChangePasswordRequest = {passwordCurrent: currentPassword, passwordNew: newPassword};

    return this.userApiService.changePassword(passwordChangeRequest).pipe(
      map(
        (response: ChangePasswordResponse) => {
          this.errorMessage = null;
          this.errorMessageDetails = null;
          this.successMessage = 'Passwort erfolgreich geändert!';
          return true;
        }
      ),
      catchError(
        (error: HttpErrorResponse) => {
          const errorBody = error.error as ChangePasswordResponse;
          this.errorMessage = errorBody.message;
          this.errorMessageDetails = errorBody.details;
          return throwError(false);
        }
      )
    );
  }

  reset() {
    this.successMessage = null;
    this.errorMessage = null;
    this.errorMessageDetails = null;
    this.form.reset();
  }

  validateNewAndRepeatedPasswords(): ValidatorFn {
    return (formGroup: UntypedFormGroup) => {
      const newPassword = formGroup.get('newPassword').value;
      const newRepeatedPassword = formGroup.get('newRepeatedPassword').value;

      if (newPassword !== newRepeatedPassword) {
        return {passwordsDontMatch: true};
      }

      return null;
    };
  }

  isValid() {
    return this.form.valid;
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
