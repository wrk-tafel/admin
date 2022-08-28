import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CountryData, CountryApiService } from '../../../common/api/country-api.service';
import { CustomValidator } from '../../../common/CustomValidator';

@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  constructor(
    private countryApiService: CountryApiService
  ) { }

  @Output() dataUpdatedEvent = new EventEmitter<void>();

  customerForm = new FormGroup({
    id: new FormControl(''),
    lastname: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    birthDate: new FormControl('',
      [
        Validators.required,
        CustomValidator.minDate(new Date(1920, 0, 1)),
        CustomValidator.maxDate(new Date())
      ]
    ),

    country: new FormControl('', Validators.required),
    telephoneNumber: new FormControl(''),
    email: new FormControl('', [Validators.maxLength(100), Validators.email]),

    address: new FormGroup({
      street: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      houseNumber: new FormControl('', [Validators.required, Validators.maxLength(10)]),
      stairway: new FormControl(''),
      door: new FormControl(''),
      postalCode: new FormControl('', [Validators.required, Validators.pattern('^[0-9]{4}$')]),
      city: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    }),

    employer: new FormControl('', Validators.required),
    income: new FormControl('', Validators.required),
    incomeDue: new FormControl('', CustomValidator.minDate(new Date()))
  });

  countries: CountryData[];

  ngOnInit(): void {
    this.countryApiService.getCountries().subscribe((data: CountryData[]) => {
      this.countries = data;
    });

    this.customerForm.valueChanges.subscribe(() => {
      this.dataUpdatedEvent.emit();
    });
  }

  get id() { return this.customerForm.get('id'); }
  get lastname() { return this.customerForm.get('lastname'); }
  get firstname() { return this.customerForm.get('firstname'); }
  get birthDate() { return this.customerForm.get('birthDate'); }
  get country() { return this.customerForm.get('country'); }
  get telephoneNumber() { return this.customerForm.get('telephoneNumber'); }
  get email() { return this.customerForm.get('email'); }

  get street() { return this.customerForm.get('address')?.get('street'); }
  get houseNumber() { return this.customerForm.get('address')?.get('houseNumber'); }
  get stairway() { return this.customerForm.get('address')?.get('stairway'); }
  get door() { return this.customerForm.get('address')?.get('door'); }
  get postalCode() { return this.customerForm.get('address')?.get('postalCode'); }
  get city() { return this.customerForm.get('address')?.get('city'); }

  get employer() { return this.customerForm.get('employer'); }
  get income() { return this.customerForm.get('income'); }
  get incomeDue() { return this.customerForm.get('incomeDue'); }
}
