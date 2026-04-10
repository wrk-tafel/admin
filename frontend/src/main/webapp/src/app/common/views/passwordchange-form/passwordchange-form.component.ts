import {Component, inject, signal} from '@angular/core';
import {form, FormField, maxLength, minLength, required, validate} from '@angular/forms/signals';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from '../../../api/user-api.service';
import {catchError, map} from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {CommonModule} from '@angular/common';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {MatDivider} from "@angular/material/list";
import {MatIcon} from "@angular/material/icon";

@Component({
  selector: 'tafel-passwordchange-form',
  templateUrl: 'passwordchange-form.component.html',
  imports: [
    FormField,
    CommonModule,
    TafelAutofocusDirective,
    FaIconComponent,
    MatFormField,
    MatLabel,
    MatError,
    MatDivider,
    MatInput,
    MatSuffix,
    MatIcon
  ]
})
export class PasswordChangeFormComponent {
  private readonly userApiService = inject(UserApiService);

  // Form model as a signal
  private emptyPasswordModel = {
    currentPassword: '',
    newPassword: '',
    newRepeatedPassword: ''
  };
  passwordFormModel = signal(this.emptyPasswordModel);

  // Create form with validators using schema function
  passwordForm = form(this.passwordFormModel, (schemaPath) => {
    required(schemaPath.currentPassword, {message: 'Pflichtfeld'});

    required(schemaPath.newPassword, {message: 'Pflichtfeld'});
    minLength(schemaPath.newPassword, 8, {
      message: 'Passwort zu kurz (Limit: 8)'
    });
    maxLength(schemaPath.newPassword, 50, {
      message: 'Passwort zu lang (Limit: 50)'
    });

    required(schemaPath.newRepeatedPassword, {message: 'Pflichtfeld'});
    minLength(schemaPath.newRepeatedPassword, 8, {
      message: 'Passwort zu kurz (Limit: 8)'
    });
    maxLength(schemaPath.newRepeatedPassword, 50, {
      message: 'Passwort zu lang (Limit: 50)'
    });

    // Cross-field validation for password matching
    validate(schemaPath.newRepeatedPassword, ({value, valueOf}) => {
      const repeatedPassword = value();
      const newPassword = valueOf(schemaPath.newPassword);

      if (repeatedPassword !== newPassword) {
        return {
          kind: 'passwordsDontMatch',
          message: 'Passwort-Wiederholung stimmt nicht überein!'
        };
      }
      return null;
    });
  });

  currentPasswordTextVisible = signal(false);
  newPasswordTextVisible = signal(false);
  newRepeatedPasswordTextVisible = signal(false);

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  errorMessageDetails = signal<string[]>([]);

  public toggleCurrentPasswordVisibility() {
    this.currentPasswordTextVisible.update(value => !value);
  }

  public toggleNewPasswordVisibility() {
    this.newPasswordTextVisible.update(value => !value);
  }

  public toggleNewRepeatedPasswordTextVisible() {
    this.newRepeatedPasswordTextVisible.update(value => !value);
  }

  changePassword(): Observable<boolean> {
    const currentPassword = this.passwordForm.currentPassword().value();
    const newPassword = this.passwordForm.newPassword().value();

    const passwordChangeRequest: ChangePasswordRequest = {passwordCurrent: currentPassword, passwordNew: newPassword};

    return this.userApiService.changePassword(passwordChangeRequest).pipe(
      map(
        /* eslint-disable @typescript-eslint/no-unused-vars */
        (response: ChangePasswordResponse) => {
          this.errorMessage.set(null);
          this.errorMessageDetails.set([]);
          this.successMessage.set('Passwort erfolgreich geändert!');
          return true;
        }
      ),
      catchError(
        (error: HttpErrorResponse) => {
          const errorBody = error.error as ChangePasswordResponse;
          this.errorMessage.set(errorBody.message);
          this.errorMessageDetails.set(errorBody.details || []);
          this.successMessage.set(null);
          return throwError(() => false);
        }
      )
    );
  }

  reset() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.errorMessageDetails.set([]);
    // Reset the model signal to clear form values
    this.passwordFormModel.set(this.emptyPasswordModel);
    // Reset form state (touched, dirty)
    this.passwordForm().reset();
  }

  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
}
