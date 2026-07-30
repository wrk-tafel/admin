import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {GeneratedPasswordResponse, UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIcon} from '@angular/material/icon';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {groupPermissionsByCategory, PermissionGroup} from '../../../../common/util/permission-grouping.util';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

@Component({
    selector: 'tafel-user-form',
    templateUrl: 'user-form.component.html',
    imports: [
        FormField,
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatIcon,
        FaIconComponent,
        TafelAutofocusDirective
    ]
})
export class UserFormComponent {
  userData = input<UserData>();
  permissionsData = input<UserPermission[]>();
  userDataChange = output<UserData>();

  private readonly userApiService = inject(UserApiService);
  private readonly toastr = inject(TafelToastrService);

  // Signal for form model
  private formModel = signal<UserFormModel>({
    id: null,
    personnelNumber: '',
    username: '',
    lastname: '',
    firstname: '',
    password: '',
    passwordRepeat: '',
    enabled: true,
    passwordChangeRequired: true
  });

  // Signal for permissions
  permissions = signal<UserPermissionFormItem[]>([]);

  permissionGroups = computed(() => groupPermissionsByCategory(this.permissions()));
  selectedPermissionsCount = computed(() => this.permissions().filter((permission) => permission.enabled).length);
  totalPermissionsCount = computed(() => this.permissions().length);

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
      // Empty password fields mean "don't change the password" - send as absent, not ''
      password: formValue.password || undefined,
      passwordRepeat: formValue.passwordRepeat || undefined,
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
          id: userData.id ?? null,
          personnelNumber: userData.personnelNumber ?? '',
          username: userData.username ?? '',
          lastname: userData.lastname ?? '',
          firstname: userData.firstname ?? '',
          password: '',
          passwordRepeat: '',
          enabled: userData.enabled ?? true,
          passwordChangeRequired: userData.passwordChangeRequired ?? true
        });

        // Update permissions
        const formPermissions: UserPermissionFormItem[] = (permissionsData ?? []).map((availablePermission) => {
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
    // markAsTouched() cascades to all descendant fields
    this.userForm().markAsTouched();
  }

  public isValid(): boolean {
    return this.userForm().valid();
  }

  public generatePassword() {

    const observer = {
      next: (response: GeneratedPasswordResponse) => {
        const password = response.password;
        this.userForm.password().value.set(password);
        this.userForm.passwordRepeat().value.set(password);

        this.passwordTextVisible.set(true);
        this.passwordRepeatTextVisible.set(true);
      },
      error: () => {
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

  public togglePermission(key: string) {
    this.permissions.update(perms => perms.map(permission =>
      permission.key === key ? {...permission, enabled: !permission.enabled} : permission
    ));
  }

  public isGroupFullySelected(group: PermissionGroup<UserPermissionFormItem>): boolean {
    return group.permissions.every((permission) => permission.enabled);
  }

  public toggleGroup(group: PermissionGroup<UserPermissionFormItem>) {
    const enable = !this.isGroupFullySelected(group);
    this.permissions.update(perms => perms.map(permission =>
      permission.category === group.category ? {...permission, enabled: enable} : permission
    ));
  }

  // Expose utility functions for template use
  protected readonly visibleErrorMessages = visibleErrorMessages;

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
