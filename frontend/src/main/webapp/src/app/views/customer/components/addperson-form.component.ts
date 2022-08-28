import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CustomValidator } from '../../../common/CustomValidator';
import { DateHelperService } from '../../../common/util/date-helper.service';
import { CustomerAddPersonData } from '../api/customer-api.service';

@Component({
  selector: 'addperson-form',
  templateUrl: 'addperson-form.component.html'
})
export class AddPersonFormComponent implements OnInit {
  constructor(
    private dateHelper: DateHelperService
  ) { }

  @Input() personData: CustomerAddPersonFormData;
  @Output() dataUpdatedEvent = new EventEmitter<void>();

  personForm = new FormGroup({
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
    this.personForm.patchValue(this.personData);
    this.birthDate.setValue(this.dateHelper.convertForInputField(this.personData.birthDate));

    this.personForm.valueChanges.subscribe(() => {
      this.dataUpdatedEvent.emit();
    });
  }

  get lastname() { return this.personForm.get('lastname'); }
  get firstname() { return this.personForm.get('firstname'); }
  get birthDate() { return this.personForm.get('birthDate'); }
  get income() { return this.personForm.get('income'); }
}

export interface CustomerAddPersonFormData extends CustomerAddPersonData {
  uuid?: string;
}
