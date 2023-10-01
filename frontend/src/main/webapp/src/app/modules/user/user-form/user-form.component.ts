import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {GeneratedPasswordResponse, UserApiService, UserData} from '../../../api/user-api.service';

@Component({
  selector: 'tafel-user-form',
  templateUrl: 'user-form.component.html'
})
export class UserFormComponent implements OnInit {
  @Input() userData: UserData;
  @Output() userDataChange = new EventEmitter<UserData>();

  form = new FormGroup({
    id: new FormControl<number>(null),
    personnelNumber: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    username: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    lastname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    enabled: new FormControl<boolean>(null, Validators.required),
    password: new FormControl<string>(null),
    passwordRepeat: new FormControl<string>(null),
    passwordChangeRequired: new FormControl<boolean>(true, Validators.required)
  }, [passwordRepeatValidator]);

  passwordTextVisible: boolean;
  passwordRepeatTextVisible: boolean;

  constructor(private userApiService: UserApiService) {
  }

  ngOnInit(): void {
    if (this.userData) {
      this.form.patchValue(this.userData);
    }

    this.form.valueChanges.subscribe(() => {
      this.userDataChange.emit(this.form.getRawValue());
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

}

export const passwordRepeatValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const passwordRepeat = control.get('passwordRepeat');

  return password && passwordRepeat && password.value !== passwordRepeat.value ? {passwordRepeatInvalid: true} : null;
};
