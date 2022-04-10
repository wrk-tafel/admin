import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'addperson-form',
  templateUrl: 'addperson-form.component.html'
})
export class AddPersonFormComponent implements OnInit {
  @Input() personData: AddPersonFormData;
  @Output() dataUpdateEvent = new EventEmitter<AddPersonFormData>();

  personForm = new FormGroup({
    uuid: new FormControl(),
    lastname: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl('', [Validators.required, , Validators.maxLength(50)]),
    birthDate: new FormControl('', Validators.required),
    income: new FormControl('')
  })

  ngOnInit(): void {
    this.personForm.valueChanges.subscribe((value) => {
      this.dataUpdateEvent.emit(value);
    });
    this.personForm.patchValue(this.personData);
  }

  get lastname() { return this.personForm.get('lastname'); }
  get firstname() { return this.personForm.get('firstname'); }
  get birthDate() { return this.personForm.get('birthDate'); }
  get income() { return this.personForm.get('income'); }
}

export interface AddPersonFormData {
  uuid?: string,
  lastname?: string,
  firstname?: string
  birthDate?: Date,
  income?: number
}
