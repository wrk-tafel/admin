import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {UserData} from '../../../api/user-api.service';

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
    passwordChangeRequired: new FormControl<boolean>(null, Validators.required)
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.userDataChange.emit(this.form.getRawValue());
    });
  }

  public markAllAsTouched() {
    this.form.markAllAsTouched();
  }

  public isValid(): boolean {
    return this.form.valid;
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

  get passwordChangeRequired() {
    return this.form.get('passwordChangeRequired');
  }

}
