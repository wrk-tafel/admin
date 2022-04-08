import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'addperson-card',
  templateUrl: 'addperson-card.component.html'
})
export class AddPersonCardComponent implements OnInit {
  @Input() personData: AddPersonCardData;
  @Output() dataUpdateEvent = new EventEmitter<AddPersonCardData>();

  personForm = new FormGroup({
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

export interface AddPersonCardData {
  lastname?: String,
  firstname?: String
  birthDate?: Date,
  income?: number
}
