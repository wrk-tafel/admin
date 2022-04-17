import { Component, Output, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, AddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';
import { CustomerData, CustomerApiService, CustomerAddPersonData, ValidateCustomerResponse } from '../api/customer-api.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent {
  constructor(
    private apiService: CustomerApiService,
    private router: Router
  ) { }

  customerData: CustomerFormData;
  additionalPersonsData: AddPersonFormData[] = [];

  @Output() saveDisabled: boolean = true;
  @Output() errorMessage: string;

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChildren(AddPersonFormComponent) addPersonForms: AddPersonFormComponent[];
  @ViewChild('validationResultModal') validationResultModal: ModalDirective;

  validationResult: ValidateCustomerResponse;

  // TODO remove mock data
  /*
  customerData: CustomerFormData = {
    lastname: 'Prantl',
    firstname: 'Stephan',
    birthDate: new Date(1987, 6, 14),
    country: 'AT',
    telephoneNumber: 664456465465,
    email: 'stephan.prantl@gmail.com',

    street: 'Leopoldauer Straße',
    houseNumber: '157A',
    stairway: '1',
    door: '21',
    postalCode: 1210,
    city: 'Wien',

    employer: 'willhaben',
    income: 1000,
    incomeDue: new Date()
  };
  additionalPersonsData: AddPersonFormData[] = [
    { lastname: 'Add', firstname: 'Pers 1', birthDate: new Date(1987, 6, 14), income: 50 },
    { lastname: 'Add', firstname: 'Pers 2', birthDate: new Date(1987, 6, 14), income: 80 }
  ];
  */

  addNewPerson() {
    this.saveDisabled = true;
    this.additionalPersonsData.push({ uuid: uuidv4() });
  }

  removePerson(index: number) {
    this.saveDisabled = true;
    this.additionalPersonsData.splice(index, 1);
  }

  trackBy(index: number, personData: AddPersonFormData) {
    return personData.uuid;
  }

  updatedCustomerFormData() {
    this.saveDisabled = true;
  }

  updatedPersonsFormData() {
    this.saveDisabled = true;
  }

  validate() {
    this.saveDisabled = true;

    if (this.formsAreInvalid()) {
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      const customerData = this.mapFormsToCustomerRequestData();
      this.apiService.validate(customerData).subscribe((result) => {
        this.validationResult = result;
        this.saveDisabled = !result.valid;
        this.validationResultModal.show();
      });
    }
  }

  save() {
    const customerData = this.mapFormsToCustomerRequestData();
    this.apiService.createCustomer(customerData)
      .pipe(
        tap(customer => {
          this.router.navigate(['/kunden/detail', customer.customerId]);
        })
      ).subscribe();
  }

  mapFormsToCustomerRequestData(): CustomerData {
    let addPersons = this.addPersonForms.map<CustomerAddPersonData>((personComponent) => {
      return {
        lastname: personComponent.lastname.value,
        firstname: personComponent.firstname.value,
        birthDate: personComponent.birthDate.value,
        income: personComponent.income.value
      }
    });

    const customer = this.customerFormComponent;
    return {
      customerId: customer.customerId.value,
      lastname: customer.lastname.value,
      firstname: customer.firstname.value,
      birthDate: customer.birthDate.value,
      country: customer.country.value,
      address: {
        street: customer.street.value,
        houseNumber: customer.houseNumber.value,
        stairway: customer.stairway.value,
        door: customer.door.value,
        postalCode: customer.postalCode.value,
        city: customer.city.value
      },
      telephoneNumber: customer.telephoneNumber.value,
      email: customer.email.value,
      employer: customer.employer.value,
      income: customer.income.value,
      incomeDue: customer.incomeDue.value,
      additionalPersons: addPersons
    }
  }

  private formsAreInvalid() {
    this.customerFormComponent.customerForm.markAllAsTouched();
    const customerFormValid = this.customerFormComponent.customerForm.valid;

    let addPersonFormsValid = true;
    this.addPersonForms.map<FormGroup>((cmp) => { return cmp.personForm })
      .forEach((form: FormGroup) => {
        form.markAllAsTouched();
        addPersonFormsValid &&= form.valid;
      });

    return !customerFormValid || !addPersonFormsValid
  }

}
