import {Component, computed, effect, inject, input, output, signal, untracked, viewChild} from '@angular/core';
import {disabled, form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {GeneratedPasswordResponse, UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {EmployeeApiService, EmployeeData} from '../../../../api/employee-api.service';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIcon} from '@angular/material/icon';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {groupPermissionsByCategory, PermissionGroup} from '../../../../common/util/permission-grouping.util';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {
  TafelEmployeeSearchCreateComponent
} from '../../../../common/components/employee-search-create/tafel-employee-search-create.component';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
import keyboardArrowUpIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_up-fill.svg';
import keyboardArrowDownIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_down-fill.svg';
import visibilityIcon from '@material-symbols/svg-400/outlined/visibility-fill.svg';
import visibilityOffIcon from '@material-symbols/svg-400/outlined/visibility_off-fill.svg';
import contentCopyIcon from '@material-symbols/svg-400/outlined/content_copy-fill.svg';

/**
 * Mirrors `UserPermissions.ADMINISTRATOR` on the backend. Kept as a constant rather than inline, so
 * the one permission with special handling in this form is named once.
 */
const ADMINISTRATOR_PERMISSION = 'ADMINISTRATOR';

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
        TafelAutofocusDirective,
        TafelEmployeeSearchCreateComponent,
        TafelInfoTooltipComponent
    ]
})
export class UserFormComponent {
  private readonly registerIcons = registerSvgIcons({
    close: closeIcon,
    keyboard_arrow_up: keyboardArrowUpIcon,
    keyboard_arrow_down: keyboardArrowDownIcon,
    visibility: visibilityIcon,
    visibility_off: visibilityOffIcon,
    content_copy: contentCopyIcon
  });

  userData = input<UserData>();
  permissionsData = input<UserPermission[]>();
  userDataChange = output<UserData>();

  employeeSearchCreate = viewChild<TafelEmployeeSearchCreateComponent>('employeeSearchCreate');

  private readonly userApiService = inject(UserApiService);
  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly authenticationService = inject(AuthenticationService);

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

  // Without existing user data the form creates a new user, which needs a password;
  // while editing, empty password fields mean "don't change the password"
  createMode = computed(() => !this.userData());

  private targetIsAdministrator = computed(() =>
    !!this.userData()?.permissions.some((permission) => permission.key === ADMINISTRATOR_PERMISSION)
  );

  /**
   * The backend refuses a username, password or forced-password-change change on an
   * administrator account unless the caller is one too (issue #3566) - locking these fields here
   * just keeps the form from offering an edit that would be refused on save, same reasoning as
   * isPermissionLocked below for the ADMINISTRATOR checkbox itself.
   */
  administratorAccountFieldsLocked = computed(() =>
    this.targetIsAdministrator() && !this.authenticationService.hasPermission(ADMINISTRATOR_PERMISSION)
  );

  // The employee currently linked via the personnel-number search, resolved through
  // `tafel-employee-search-create` (matching logistics' driver/co-driver pattern) rather than typed
  // freely, so an account can no longer reference a personnel number no employee actually holds.
  selectedEmployee = signal<EmployeeData | null>(null);
  // True only while an existing user's personnel number is being resolved back to its employee on
  // load - the personnelNumber validator treats this as provisionally valid so the field doesn't
  // flash an error before that lookup returns.
  private resolvingEmployee = signal(false);
  // Edit mode only: the password fields sit inside a collapsed "Passwort zurücksetzen" section so a
  // save can't accidentally reset a password nobody meant to touch. Always considered open in create
  // mode, where a password is mandatory.
  passwordResetExpanded = signal(false);
  passwordFieldsVisible = computed(() => this.createMode() || this.passwordResetExpanded());

  // Create signal form with validation schema
  userForm = form(this.formModel, (schemaPath) => {
    required(schemaPath.personnelNumber, {message: 'Pflichtfeld'});
    maxLength(schemaPath.personnelNumber, 50, {message: 'Personalnummer zu lang (maximal 50 Zeichen)'});
    validate(schemaPath.personnelNumber, ({value}) => {
      if (this.resolvingEmployee()) {
        return undefined;
      }
      const employee = this.selectedEmployee();
      if (!employee || employee.personnelNumber !== value()) {
        return {kind: 'employeeNotLinked', message: 'Bitte einen Mitarbeiter über die Personalnummer-Suche auswählen'};
      }
      return undefined;
    });

    required(schemaPath.username, {message: 'Pflichtfeld'});
    maxLength(schemaPath.username, 50, {message: 'Benutzername zu lang (maximal 50 Zeichen)'});
    disabled(schemaPath.username, {when: () => this.administratorAccountFieldsLocked()});

    required(schemaPath.lastname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.lastname, 50, {message: 'Nachname zu lang (maximal 50 Zeichen)'});

    required(schemaPath.firstname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.firstname, 50, {message: 'Vorname zu lang (maximal 50 Zeichen)'});

    required(schemaPath.password, {message: 'Pflichtfeld', when: () => this.createMode()});
    required(schemaPath.passwordRepeat, {message: 'Pflichtfeld', when: () => this.createMode()});

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

    disabled(schemaPath.passwordChangeRequired, {when: () => this.administratorAccountFieldsLocked()});
  });

  passwordTextVisible = signal(false);
  passwordRepeatTextVisible = signal(false);

  // Derived user data from form value changes
  private derivedUserData = computed(() => {
    const formValue = this.formModel();
    const perms = this.permissions();
    // The password fields are collapsed behind "Passwort zurücksetzen" precisely so a save can't
    // accidentally reset a password nobody meant to touch - whatever is still sitting in those
    // controls from a since-collapsed expand must not be sent once they're hidden again. See #3530.
    const passwordFieldsVisible = this.passwordFieldsVisible();

    return {
      ...formValue,
      // Empty password fields mean "don't change the password" - send as absent, not ''
      password: passwordFieldsVisible ? (formValue.password || undefined) : undefined,
      passwordRepeat: passwordFieldsVisible ? (formValue.passwordRepeat || undefined) : undefined,
      permissions: perms.filter((permission) => permission.enabled === true)
    } as UserData;
  });

  // A serialized snapshot of derivedUserData taken right after the form was (re)loaded or saved -
  // isDirty() compares the live value against it rather than relying on signal-forms' own dirty
  // tracking, which only reacts to control-originated edits and would miss e.g. an employee picked
  // through the search dialog or a permission toggle.
  private initialSnapshot = signal<string | null>(null);
  private isDirtyState = computed(() => {
    const initial = this.initialSnapshot();
    return initial !== null && JSON.stringify(this.derivedUserData()) !== initial;
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

        // Resolve the employee already linked to this user so it renders as "selected" immediately,
        // instead of asking the admin to re-search a personnel number that is already valid.
        this.passwordResetExpanded.set(false);
        this.selectedEmployee.set(null);
        this.resolvingEmployee.set(true);
        this.employeeApiService.checkPersonnelNumberAvailability(userData.personnelNumber).subscribe({
          next: (response) => {
            this.selectedEmployee.set(response.existingEmployee ?? null);
            this.resolvingEmployee.set(false);
          },
          error: () => {
            this.resolvingEmployee.set(false);
          }
        });
      } else if (permissionsData) {
        // Initialize with default permissions (all disabled)
        const formPermissions: UserPermissionFormItem[] = permissionsData.map((permission) => ({
          ...permission,
          enabled: false
        }));
        this.permissions.set(formPermissions);
        this.selectedEmployee.set(null);
        this.resolvingEmployee.set(false);
      }

      // Freshly (re)loaded, so this is the baseline isDirty() compares against - read outside the
      // tracking context, since derivedUserData reads the signals this same effect just wrote.
      untracked(() => this.initialSnapshot.set(JSON.stringify(this.derivedUserData())));
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

  /**
   * Whether the form differs from the state it was last loaded or saved in - drives the
   * unsaved-changes navigation guard in `UserEditComponent`.
   */
  public isDirty(): boolean {
    return this.isDirtyState();
  }

  /**
   * Rebases isDirty() on the current values, called right after a successful save so the
   * navigation guard that follows (routing to the detail page) doesn't ask to confirm discarding
   * changes that were, in fact, just saved.
   */
  public markSaved() {
    untracked(() => this.initialSnapshot.set(JSON.stringify(this.derivedUserData())));
  }

  public generatePassword() {

    const observer = {
      next: (response: GeneratedPasswordResponse) => {
        const password = response.password;
        this.userForm.password().value.set(password);
        this.userForm.passwordRepeat().value.set(password);

        this.passwordTextVisible.set(true);
        this.passwordRepeatTextVisible.set(true);

        // The point of generating a password here is handing it to a new colleague, so the
        // sensible default is requiring them to set their own on first login.
        this.userForm.passwordChangeRequired().value.set(true);
      },
      error: () => {
        this.toastr.error('Passwort-Generierung fehlgeschlagen!', 'Fehler');
      },
    };

    this.userApiService.generatePassword().subscribe(observer);
  }

  public copyPassword() {
    const password = this.userForm.password().value();
    if (!password) {
      return;
    }
    navigator.clipboard.writeText(password).then(
      () => this.toastr.success('Passwort in die Zwischenablage kopiert!'),
      () => this.toastr.error('Kopieren in die Zwischenablage fehlgeschlagen!')
    );
  }

  public togglePasswordVisibility() {
    this.passwordTextVisible.update(value => !value);
  }

  public togglePasswordRepeatVisibility() {
    this.passwordRepeatTextVisible.update(value => !value);
  }

  /**
   * Collapsing also clears the password controls, not just their derived-value stripping in
   * `derivedUserData` - otherwise a mismatching password typed and then collapsed leaves
   * `passwordRepeatInvalid` on the (now hidden) controls, so `userForm().valid()` stays false and
   * "Speichern" is disabled with no visible error to explain why. See #3563.
   */
  public togglePasswordResetSection() {
    const nowExpanded = !this.passwordResetExpanded();
    this.passwordResetExpanded.set(nowExpanded);
    if (!nowExpanded) {
      this.userForm.password().value.set('');
      this.userForm.passwordRepeat().value.set('');
    }
  }

  public triggerEmployeeSearch() {
    const search = this.employeeSearchCreate();
    if (search && this.userForm.personnelNumber().value()) {
      search.triggerSearch();
    }
  }

  /**
   * The lastname/firstname fields save onto the linked employee (see `resolveEmployee` on the
   * backend), so they're kept in sync with whichever employee the personnel-number search resolved
   * - typing a name there is for correcting the employee's name, not for entering an independent
   * one that would otherwise silently overwrite it on save.
   */
  public setSelectedEmployee(employee: EmployeeData) {
    this.selectedEmployee.set(employee);
    this.userForm.personnelNumber().value.set(employee.personnelNumber);
    this.userForm.personnelNumber().markAsTouched();
    this.userForm.lastname().value.set(employee.lastname);
    this.userForm.firstname().value.set(employee.firstname);
  }

  public resetSelectedEmployee() {
    this.selectedEmployee.set(null);
    this.userForm.personnelNumber().value.set('');
    this.userForm.lastname().value.set('');
    this.userForm.firstname().value.set('');
  }

  /**
   * ADMINISTRATOR grants every other permission, so only an administrator may hand it out or take
   * it away — the backend rejects the change either way (see `UserController`). Locking it here just
   * keeps the form from offering an edit that would be refused on save.
   */
  public isPermissionLocked(key: string): boolean {
    return key === ADMINISTRATOR_PERMISSION && !this.authenticationService.hasPermission(ADMINISTRATOR_PERMISSION);
  }

  public togglePermission(key: string) {
    if (this.isPermissionLocked(key)) {
      return;
    }
    this.permissions.update(perms => perms.map(permission =>
      permission.key === key ? {...permission, enabled: !permission.enabled} : permission
    ));
  }

  public isGroupFullySelected(group: PermissionGroup<UserPermissionFormItem>): boolean {
    // A locked permission can't be changed, so it must not decide whether the group counts as fully
    // selected - otherwise "Alle auswählen" would sit there permanently unable to do what it says.
    return group.permissions
      .filter((permission) => !this.isPermissionLocked(permission.key))
      .every((permission) => permission.enabled);
  }

  public toggleGroup(group: PermissionGroup<UserPermissionFormItem>) {
    const enable = !this.isGroupFullySelected(group);
    this.permissions.update(perms => perms.map(permission =>
      permission.category === group.category && !this.isPermissionLocked(permission.key)
        ? {...permission, enabled: enable}
        : permission
    ));
  }

  // Expose utility functions for template use
  protected readonly visibleErrorMessages = visibleErrorMessages;

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
