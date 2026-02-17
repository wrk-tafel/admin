import {Component, effect, inject, input, linkedSignal, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {GeneratedPasswordResponse, UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
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

@Component({
    selector: 'tafel-user-form',
    templateUrl: 'user-form.component.html',
    imports: [
        ReactiveFormsModule,
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
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    id: this.fb.control<number>(null),
    personnelNumber: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    username: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: this.fb.control<string>(null, [Validators.required, Validators.maxLength(50)]),
    password: this.fb.control<string>(null),
    passwordRepeat: this.fb.control<string>(null),
    enabled: this.fb.control<boolean>(true, Validators.required),
    passwordChangeRequired: this.fb.control<boolean>(true, Validators.required),
    permissions: this.fb.array<FormControl<UserPermissionFormItem>>([])
  }, [passwordRepeatValidator]);

  passwordTextVisible: boolean;
  passwordRepeatTextVisible: boolean;

  // Convert form value changes to signal (skip initial value to avoid ExpressionChangedAfterItHasBeenCheckedError)
  private formValue = toSignal(this.form.valueChanges);

  // Derived user data from form value changes using linkedSignal
  // Maps raw form data to UserData with filtered permissions
  private derivedUserData = linkedSignal(() => {
    const value = this.formValue();
    if (!value) {
      return null as UserData | null;
    }
    const rawValue: UserFormData = this.form.getRawValue();
    return {
      ...rawValue,
      permissions: rawValue.permissions.filter((permission) => permission.enabled === true)
    } as UserData | null;
  });

  constructor() {
    // Initialize form when userData or permissionsData changes
    effect(() => {
      const userData = this.userData();
      const permissionsData = this.permissionsData();

      if (userData) {
        const formPermissions: UserPermissionFormItem[] = permissionsData.map((availablePermission) => {
          const enabled = userData.permissions.findIndex((userPermission) => userPermission.key === availablePermission.key) !== -1;
          return {...availablePermission, enabled: enabled};
        });

        const data: UserFormData = {
          ...userData,
          permissions: undefined
        };
        this.form.patchValue(data);
        this.permissions.clear();
        formPermissions.forEach((permission) => this.pushUserPermissionControl(permission, permission.enabled));
      } else if (permissionsData) {
        permissionsData.forEach((permission) => this.pushUserPermissionControl(permission, false));
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
    this.form.markAllAsTouched();
  }

  public isValid(): boolean {
    if (this.form) {
      return this.form.valid;
    }
    return false;
  }

  public generatePassword() {
    /* eslint-disable @typescript-eslint/no-empty-function */
    const observer = {
      next: (response: GeneratedPasswordResponse) => {
        const password = response.password;
        this.password.setValue(password);
        this.passwordRepeat.setValue(password);

        this.passwordTextVisible = true;
        this.passwordRepeatTextVisible = true;
      },
      error: error => {
        this.toastService.showToast({
          type: ToastType.ERROR,
          title: 'Fehler',
          message: 'Passwort-Generierung fehlgeschlagen!'
        });
      },
    };

    this.userApiService.generatePassword().subscribe(observer);
  }

  public togglePasswordVisibility() {
    this.passwordTextVisible = !this.passwordTextVisible;
  }

  public togglePasswordRepeatVisibility() {
    this.passwordRepeatTextVisible = !this.passwordRepeatTextVisible;
  }

  public trackBy(index: number, permissionDataControl: FormGroup) {
    const permissionData: UserPermission = permissionDataControl.value;
    return permissionData.key;
  }

  private pushUserPermissionControl(userPermission: UserPermission, enabled: boolean) {
    const control = this.fb.group({
      key: this.fb.control<string>(userPermission.key),
      title: this.fb.control<string>(userPermission.title),
      enabled: this.fb.control<boolean>(enabled)
    });

    this.permissions.push(control);
  }

  get id() {
    return this.form.get('id');
  }

  get username() {
    return this.form.get('username');
  }

  get personnelNumber() {
    return this.form.get('personnelNumber');
  }

  get lastname() {
    return this.form.get('lastname');
  }

  get firstname() {
    return this.form.get('firstname');
  }

  get enabled() {
    return this.form.get('enabled');
  }

  get password() {
    return this.form.get('password');
  }

  get passwordRepeat() {
    return this.form.get('passwordRepeat');
  }

  get passwordChangeRequired() {
    return this.form.get('passwordChangeRequired');
  }

  get permissions(): FormArray {
    return this.form.get('permissions') as FormArray;
  }

  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faEye = faEye;
}

export const passwordRepeatValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const passwordRepeat = control.get('passwordRepeat');

  return password && passwordRepeat && password.value !== passwordRepeat.value ? {passwordRepeatInvalid: true} : null;
};

export interface UserFormData extends UserData {
  permissions: UserPermissionFormItem[];
}

export interface UserPermissionFormItem extends UserPermission {
  enabled: boolean;
}
