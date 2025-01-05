import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators} from '@angular/forms';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from '../../../api/user-api.service';
import {catchError, map} from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {CommonModule} from '@angular/common';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {InputGroupComponent, InputGroupTextDirective} from "@coreui/angular";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";

@Component({
  selector: 'tafel-passwordchange-form',
  templateUrl: 'passwordchange-form.component.html',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    TafelAutofocusDirective,
    InputGroupComponent,
    FaIconComponent,
    InputGroupTextDirective
  ],
  standalone: true
})
export class PasswordChangeFormComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
      currentPassword: this.fb.control<string>(null, [
        Validators.required
      ]),
      newPassword: this.fb.control<string>(null, [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50)
      ]),
      newRepeatedPassword: this.fb.control<string>(null, [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50)
      ])
    },
    {
      validators: [this.validateNewAndRepeatedPasswords()]
    }
  );

  currentPasswordTextVisible: boolean;
  newPasswordTextVisible: boolean;
  newRepeatedPasswordTextVisible: boolean;

  successMessage: string;
  errorMessage: string;
  errorMessageDetails: string[];

  public toggleCurrentPasswordVisibility() {
    this.currentPasswordTextVisible = !this.currentPasswordTextVisible;
  }

  public toggleNewPasswordVisibility() {
    this.newPasswordTextVisible = !this.newPasswordTextVisible;
  }

  public toggleNewRepeatedPasswordTextVisible() {
    this.newRepeatedPasswordTextVisible = !this.newRepeatedPasswordTextVisible;
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

  changePassword(): Observable<boolean> {
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;

    const passwordChangeRequest: ChangePasswordRequest = {passwordCurrent: currentPassword, passwordNew: newPassword};

    return this.userApiService.changePassword(passwordChangeRequest).pipe(
      map(
        /* eslint-disable @typescript-eslint/no-unused-vars */
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
          this.successMessage = null;
          return throwError(() => false);
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
    return (formGroup: FormGroup) => {
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

  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
}
