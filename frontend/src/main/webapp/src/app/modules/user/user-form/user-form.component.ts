import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {GeneratedPasswordResponse, UserApiService, UserData, UserPermission} from '../../../api/user-api.service';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';

@Component({
  selector: 'tafel-user-form',
  templateUrl: 'user-form.component.html'
})
export class UserFormComponent implements OnInit {
  @Input() userData: UserData;
  @Input() permissionsData: UserPermission[];
  @Output() userDataChange = new EventEmitter<UserData>();

  form = new FormGroup({
    id: new FormControl<number>(null),
    personnelNumber: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    username: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    password: new FormControl<string>(null),
    passwordRepeat: new FormControl<string>(null),
    enabled: new FormControl<boolean>(true, Validators.required),
    passwordChangeRequired: new FormControl<boolean>(true, Validators.required),
    permissions: new FormArray<FormControl<UserPermissionFormItem>>([])
  }, [passwordRepeatValidator]);

  passwordTextVisible: boolean;
  passwordRepeatTextVisible: boolean;

  constructor(
    private userApiService: UserApiService,
    private toastService: ToastService
  ) {
  }

  ngOnInit(): void {
    if (this.userData) {
      const formPermissions: UserPermissionFormItem[] = this.permissionsData.map((availablePermission) => {
        const enabled = this.userData.permissions.findIndex((userPermission) => userPermission.key === availablePermission.key) !== -1;
        return {...availablePermission, enabled: enabled};
      });

      const data = {
        ...this.userData,
        permissions: formPermissions
      };
      this.form.patchValue(data);
      formPermissions.forEach((permission) => this.pushUserPermissionControl(permission, permission.enabled));
    } else {
      this.permissionsData.forEach((permission) => this.pushUserPermissionControl(permission, false));
    }

    this.form.valueChanges.subscribe(() => {
      const rawValue: UserFormData = this.form.getRawValue();
      const mappedUserData: UserData = {
        ...rawValue,
        permissions: rawValue.permissions.filter((permission) => permission.enabled === true)
      };
      this.userDataChange.emit(mappedUserData);
    });
  }

  private pushUserPermissionControl(userPermission: UserPermission, enabled: boolean) {
    const control = new FormGroup({
      key: new FormControl<string>(userPermission.key),
      title: new FormControl<string>(userPermission.title),
      enabled: new FormControl<boolean>(enabled)
    });

    this.permissions.push(control);
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
