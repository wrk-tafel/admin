import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {GeneratedPasswordResponse, UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import { ToastrService } from 'ngx-toastr';
import {CommonModule, NgClass} from '@angular/common';
import {
  ButtonDirective,
  FormCheckInputDirective,
  FormControlDirective,
  FormLabelDirective,
  InputGroupComponent,
  InputGroupTextDirective
} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {getErrorMessages, shouldShowErrors} from '../../../../common/util/signal-form-helper';

@Component({
    selector: 'tafel-user-form',
    templateUrl: 'user-form.component.html',
    imports: [
        FormField,
        NgClass,
        InputGroupComponent,
        InputGroupTextDirective,
        CommonModule,
        FormControlDirective,
        FormLabelDirective,
        FormCheckInputDirective,
        FaIconComponent,
        ButtonDirective,
        TafelAutofocusDirective
    ]
})
export class UserFormComponent {
  userData = input<UserData>();
  permissionsData = input<UserPermission[]>();
  userDataChange = output<UserData>();

  private readonly userApiService = inject(UserApiService);
  private readonly toastr = inject(ToastrService);

  // Signal for form model
  private formModel = signal<UserFormModel>({
    id: null,
    personnelNumber: '',
    username: '',
    lastname: '',
    firstname: '',
    password: null,
    passwordRepeat: null,
    enabled: true,
    passwordChangeRequired: true
  });

  // Signal for permissions
  permissions = signal<UserPermissionFormItem[]>([]);

  // Create signal form with validation schema
  userForm = form(this.formModel, (schemaPath) => {
    required(schemaPath.personnelNumber, {message: 'Pflichtfeld'});
    maxLength(schemaPath.personnelNumber, 50, {message: 'Personalnummer zu lang (maximal 50 Zeichen)'});

    required(schemaPath.username, {message: 'Pflichtfeld'});
    maxLength(schemaPath.username, 50, {message: 'Benutzername zu lang (maximal 50 Zeichen)'});

    required(schemaPath.lastname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.lastname, 50, {message: 'Nachname zu lang (maximal 50 Zeichen)'});

    required(schemaPath.firstname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.firstname, 50, {message: 'Vorname zu lang (maximal 50 Zeichen)'});

    // Custom validator for password repeat matching
    validate(schemaPath.passwordRepeat, ({ value, valueOf }) => {
      const passwordRepeatValue = value();
      const passwordValue = valueOf(schemaPath.password);

      if (!passwordValue || !passwordRepeatValue) {
        return undefined;
      }

      return passwordRepeatValue === passwordValue
        ? undefined
        : { kind: 'passwordRepeatInvalid', message: 'Passwort stimmt nicht mit der Wiederholung überein!' };
    });
  });

  passwordTextVisible = signal(false);
  passwordRepeatTextVisible = signal(false);

  // Derived user data from form value changes
  private derivedUserData = computed(() => {
    const formValue = this.formModel();
    const perms = this.permissions();

    return {
      ...formValue,
      permissions: perms.filter((permission) => permission.enabled === true)
    } as UserData;
  });

  constructor() {
    // Initialize form when userData or permissionsData changes
    effect(() => {
      const userData = this.userData();
      const permissionsData = this.permissionsData();

      if (userData) {
        // Update form model
        this.formModel.set({
          id: userData.id,
          personnelNumber: userData.personnelNumber ?? '',
          username: userData.username ?? '',
          lastname: userData.lastname ?? '',
          firstname: userData.firstname ?? '',
          password: null,
          passwordRepeat: null,
          enabled: userData.enabled ?? true,
          passwordChangeRequired: userData.passwordChangeRequired ?? true
        });

        // Update permissions
        const formPermissions: UserPermissionFormItem[] = permissionsData.map((availablePermission) => {
          const enabled = userData.permissions.findIndex((userPermission) => userPermission.key === availablePermission.key) !== -1;
          return {...availablePermission, enabled: enabled};
        });
        this.permissions.set(formPermissions);
      } else if (permissionsData) {
        // Initialize with default permissions (all disabled)
        const formPermissions: UserPermissionFormItem[] = permissionsData.map((permission) => ({
          ...permission,
          enabled: false
        }));
        this.permissions.set(formPermissions);
      }
    });

    // Emit userDataChange when derived user data changes
    effect(() => {
      const userData = this.derivedUserData();
      if (userData) {
        this.userDataChange.emit(userData);
      }
    });
  }

  public markAllAsTouched() {
    // Manually mark all fields as touched in signal forms
    this.userForm.personnelNumber().markAsTouched();
    this.userForm.username().markAsTouched();
    this.userForm.lastname().markAsTouched();
    this.userForm.firstname().markAsTouched();
    this.userForm.password().markAsTouched();
    this.userForm.passwordRepeat().markAsTouched();
    this.userForm.enabled().markAsTouched();
    this.userForm.passwordChangeRequired().markAsTouched();
  }

  public isValid(): boolean {
    return this.userForm().valid();
  }

  public generatePassword() {
    /* eslint-disable @typescript-eslint/no-empty-function */
    const observer = {
      next: (response: GeneratedPasswordResponse) => {
        const password = response.password;
        this.userForm.password().value.set(password);
        this.userForm.passwordRepeat().value.set(password);

        this.passwordTextVisible.set(true);
        this.passwordRepeatTextVisible.set(true);
      },
      error: error => {
        this.toastr.error('Passwort-Generierung fehlgeschlagen!', 'Fehler');
      },
    };

    this.userApiService.generatePassword().subscribe(observer);
  }

  public togglePasswordVisibility() {
    this.passwordTextVisible.update(value => !value);
  }

  public togglePasswordRepeatVisibility() {
    this.passwordRepeatTextVisible.update(value => !value);
  }

  public trackBy(index: number, permission: UserPermissionFormItem) {
    return permission.key;
  }

  public togglePermission(index: number) {
    this.permissions.update(perms => {
      const updated = [...perms];
      updated[index] = {...updated[index], enabled: !updated[index].enabled};
      return updated;
    });
  }

  // Expose utility functions for template use
  protected readonly getErrorMessages = getErrorMessages;
  protected readonly shouldShowErrors = shouldShowErrors;

  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faEye = faEye;
}

export interface UserFormModel {
  id: number | null;
  personnelNumber: string;
  username: string;
  lastname: string;
  firstname: string;
  password: string;
  passwordRepeat: string;
  enabled: boolean;
  passwordChangeRequired: boolean;
}

export interface UserPermissionFormItem extends UserPermission {
  enabled: boolean;
}
