import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CustomValidator } from '../../../common/CustomValidator';
import { CustomerAddPersonData } from '../api/customer-api.service';

@Component({
  selector: 'addperson-form',
  templateUrl: 'addperson-form.component.html'
})
export class AddPersonFormComponent implements OnInit {
  @Input()
  set personData(personData: CustomerAddPersonFormData) {
    this.form.patchValue(personData);
  }
  get personData() { return this.personData; }

  @Output() dataUpdatedEvent = new EventEmitter<CustomerAddPersonFormData>();

  form = new FormGroup({
    uuid: new FormControl(),
    lastname: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl('', [Validators.required, , Validators.maxLength(50)]),
    birthDate: new FormControl('', [
      Validators.required,
      CustomValidator.minDate(new Date(1920, 0, 1)),
      CustomValidator.maxDate(new Date())
    ]),
    income: new FormControl('')
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.dataUpdatedEvent.emit(this.form.value);
    });
  }

  get lastname() { return this.form.get('lastname'); }
  get firstname() { return this.form.get('firstname'); }
  get birthDate() { return this.form.get('birthDate'); }
  get income() { return this.form.get('income'); }
}

export interface CustomerAddPersonFormData extends CustomerAddPersonData {
  uuid?: string;
}
