import {Component, computed, inject, signal} from '@angular/core';
import {form, FormField, maxLength, minLength, required, validate} from '@angular/forms/signals';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from '../../../api/user-api.service';
import {catchError, map} from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {CommonModule} from '@angular/common';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from '@angular/material/input';
import {MatDivider} from '@angular/material/list';
import {MatIcon} from '@angular/material/icon';
import {MatProgressBar} from '@angular/material/progress-bar';
import {visibleErrorMessages} from '../../util/signal-form-helper';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../http/suppress-error-toast.token';
import {AuthenticationService} from '../../security/authentication.service';
import {registerSvgIcons} from '../../util/svg-icon.util';
import visibilityIcon from '@material-symbols/svg-400/outlined/visibility.svg';
import visibilityOffIcon from '@material-symbols/svg-400/outlined/visibility_off.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close.svg';

/**
 * Client-side mirror of the rules `WebSecurityConfig`'s Passay `DefaultPasswordValidator` enforces
 * server-side, used only to drive the live checklist below - the backend response stays the source
 * of truth, this is purely a head start so most users never see a rejection in the first place.
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 50;
const BANNED_PASSWORD_WORDS = ['wrk', 'örk', 'oerk', 'tafel', 'roteskreuz', 'toet', 'töt', '1030'];

interface PasswordRuleCheck {
  label: string;
  met: boolean;
}

interface PasswordStrength {
  score: number;
  label: string;
  level: 'weak' | 'medium' | 'strong';
}

@Component({
  selector: 'tafel-passwordchange-form',
  templateUrl: 'passwordchange-form.component.html',
  imports: [
    FormField,
    CommonModule,
    TafelAutofocusDirective,
    MatFormField,
    MatLabel,
    MatError,
    MatDivider,
    MatInput,
    MatSuffix,
    MatIcon,
    MatProgressBar
  ]
})
export class PasswordChangeFormComponent {
  private readonly registerIcons = registerSvgIcons({
    visibility: visibilityIcon,
    visibility_off: visibilityOffIcon,
    check: checkIcon,
    close: closeIcon
  });

  private readonly userApiService = inject(UserApiService);
  private readonly authenticationService = inject(AuthenticationService);

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

  /**
   * Live checklist for the "Neues Passwort" field, updating on every keystroke instead of only
   * surfacing violations after a submit was rejected server-side (see #3209).
   */
  passwordRules = computed<PasswordRuleCheck[]>(() => {
    const newPassword = this.passwordForm.newPassword().value();
    const hasValue = newPassword.length > 0;
    const lowerPassword = newPassword.toLowerCase();
    const username = (this.authenticationService.getUsername() ?? '').toLowerCase();

    const containsUsername = username.length > 0 && (
      lowerPassword.includes(username) || lowerPassword.includes([...username].reverse().join(''))
    );
    const containsBannedWord = BANNED_PASSWORD_WORDS.some(word => lowerPassword.includes(word));

    return [
      {
        label: `Mindestens ${PASSWORD_MIN_LENGTH}, maximal ${PASSWORD_MAX_LENGTH} Zeichen`,
        met: hasValue && newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= PASSWORD_MAX_LENGTH
      },
      {
        label: 'Enthält nicht den Benutzernamen',
        met: hasValue && !containsUsername
      },
      {
        label: 'Keine Leerzeichen',
        met: hasValue && !/\s/.test(newPassword)
      },
      {
        label: 'Enthält keines der gesperrten Wörter (wrk, örk, oerk, tafel, roteskreuz, toet, töt, 1030)',
        met: hasValue && !containsBannedWord
      }
    ];
  });

  /**
   * Cheap strength heuristic (length plus character variety) - not a policy rule on its own, just a
   * nudge away from minimum-effort passwords. Empty while the field is empty so the meter doesn't
   * render at all before the user has typed anything.
   */
  passwordStrength = computed<PasswordStrength>(() => {
    const newPassword = this.passwordForm.newPassword().value();
    if (newPassword.length === 0) {
      return {score: 0, label: '', level: 'weak'};
    }

    let score = 0;
    if (newPassword.length >= PASSWORD_MIN_LENGTH) {
      score += 25;
    }
    if (newPassword.length >= 12) {
      score += 15;
    }
    if (newPassword.length >= 16) {
      score += 10;
    }
    if (/[a-z]/.test(newPassword)) {
      score += 10;
    }
    if (/[A-Z]/.test(newPassword)) {
      score += 15;
    }
    if (/[0-9]/.test(newPassword)) {
      score += 15;
    }
    if (/[^a-zA-Z0-9]/.test(newPassword)) {
      score += 20;
    }
    score = Math.min(score, 100);

    if (score < 40) {
      return {score, label: 'Schwach', level: 'weak'};
    }
    if (score < 75) {
      return {score, label: 'Mittel', level: 'medium'};
    }
    return {score, label: 'Stark', level: 'strong'};
  });

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

    return this.userApiService.changePassword(passwordChangeRequest, SUPPRESS_ERROR_TOAST_CONTEXT).pipe(
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

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
