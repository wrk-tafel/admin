import { Component, OnInit, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, CustomerAddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';
import { CustomerData, CustomerApiService, ValidateCustomerResponse } from '../api/customer-api.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { tap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { CountryApiService, CountryData } from '../../../common/api/country-api.service';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent implements OnInit {
  constructor(
    private customerApiService: CustomerApiService,
    private countryApiService: CountryApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.countryApiService.getCountries().subscribe((data: CountryData[]) => {
      this.countries = data;
    });

    this.route.params.subscribe(params => {
      const customerId = +params['id'];
      if (customerId) {
        this.customerApiService.getCustomer(customerId).subscribe((customerData) => {
          // Editing doesn't need a validation check
          this.saveDisabled = false;
          this.editMode = true;

          // Load data into forms
          const selectedCountry = this.countries.filter(country => country.id === customerData.country.id)[0];
          this.customerData = {
            ...customerData,
            country: selectedCountry
          };

          this.additionalPersonsData.splice(0);
          customerData.additionalPersons.forEach((person) => {
            this.additionalPersonsData.push(person);
          });

          // Mark forms as touched to show the validation state (postponed to next makrotask after angular finished)
          setTimeout(() => {
            this.customerFormComponent.form.markAllAsTouched();
            this.addPersonForms.forEach((personForm) => {
              personForm.form.markAllAsTouched();
            });
          });
        });
      }
    });
  }

  countries: CountryData[];
  customerData: CustomerData;
  additionalPersonsData: CustomerAddPersonFormData[] = [];

  editMode: boolean = false;
  saveDisabled: boolean = true;
  errorMessage: string;

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChildren(AddPersonFormComponent) addPersonForms: AddPersonFormComponent[];
  @ViewChild('validationResultModal') validationResultModal: ModalDirective;

  validationResult: ValidateCustomerResponse;

  addNewPerson() {
    this.setSaveDisabled(true);
    this.additionalPersonsData.push({ uuid: uuidv4(), firstname: null, lastname: null, birthDate: null });
  }

  removePerson(index: number) {
    this.setSaveDisabled(true);
    this.additionalPersonsData.splice(index, 1);
  }

  trackBy(index: number, personData: CustomerAddPersonFormData) {
    return personData.uuid;
  }

  updatedCustomerFormData(event: CustomerData) {
    this.customerData = event;
    this.setSaveDisabled(true);
  }

  updatedAddPersonsFormData(event: CustomerAddPersonFormData) {
    const index = this.additionalPersonsData.findIndex(person => person.uuid === event.uuid);
    this.additionalPersonsData[index] = event;
    this.setSaveDisabled(true);
  }

  validate() {
    this.setSaveDisabled(true);

    if (this.formsAreInvalid()) {
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      const customerData = this.readFullData();
      console.log("CUSDATA", customerData);
      this.customerApiService.validate(customerData).subscribe((result) => {
        this.validationResult = result;

        this.setSaveDisabled(!result.valid);
        this.validationResultModal.show();
      });
    }
  }

  save() {
    const customerData = this.readFullData();
    // TODO remove
    console.log("SAVE DATA", customerData);

    if (!this.editMode) {
      this.customerApiService.createCustomer(customerData)
        .pipe(
          tap(customer => {
            this.router.navigate(['/kunden/detail', customer.id]);
          })
        ).subscribe();
    } else {
      this.customerApiService.updateCustomer(customerData)
        .pipe(
          tap(customer => {
            this.router.navigate(['/kunden/detail', customer.id]);
          })
        ).subscribe();
    }
  }

  private setSaveDisabled(value: boolean) {
    if (!this.editMode) {
      this.saveDisabled = value;
    }
  }

  private readFullData(): CustomerData {
    return {
      ...this.customerData,
      additionalPersons: this.additionalPersonsData
    }
  }

  private formsAreInvalid() {
    this.customerFormComponent.form.markAllAsTouched();
    const customerFormValid = this.customerFormComponent.form.valid;

    let addPersonFormsValid = true;
    this.addPersonForms.map<FormGroup>((cmp) => cmp.form)
      .forEach((form: FormGroup) => {
        form.markAllAsTouched();
        addPersonFormsValid &&= form.valid;
      });

    return !customerFormValid || !addPersonFormsValid;
  }

}
