import { Component, Output, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, AddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';
import { CustomerRequestData, CustomerApiService, CustomerAddPersonRequestData } from '../api/customer-api.service';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent {
  constructor(
    private apiService: CustomerApiService
  ) { }

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChildren(AddPersonFormComponent) addPersonForms: AddPersonFormComponent[];

  customerData: CustomerFormData;
  additionalPersonsData: AddPersonFormData[] = [];

  @Output() saveDisabled: boolean = true;
  @Output() errorMessage: string;

  updateCustomerFormData(updatedFormData: CustomerFormData) {
    this.customerData = updatedFormData;
  }

  updatePersonsData(index: number, additionalPersonsData: AddPersonFormData) {
    this.additionalPersonsData[index] = additionalPersonsData;
  }

  addNewPerson() {
    this.additionalPersonsData.push({ uuid: uuidv4() });
  }

  removePerson(index: number) {
    this.additionalPersonsData.splice(index, 1);
  }

  trackBy(index: number, personData: AddPersonFormData) {
    return personData.uuid;
  }

  validate() {
    this.customerFormComponent.customerForm.markAllAsTouched();
    const customerFormValid = this.customerFormComponent.customerForm.valid;

    let addPersonFormsValid = true;
    this.addPersonForms.map<FormGroup>((cmp) => { return cmp.personForm })
      .forEach((form: FormGroup) => {
        form.markAllAsTouched();
        addPersonFormsValid &&= form.valid;
      });

    if (!customerFormValid || !addPersonFormsValid) {
      this.errorMessage = "Bitte Eingaben überprüfen!";
    } else {
      this.errorMessage = null;

      const customerData = this.mapFormsToCustomerRequestData();
      this.apiService.validate(customerData).subscribe((result) => {
        this.saveDisabled = !result.valid;
      });
    }
  }

  save() {
    // TODO impl
    throw new Error('Method not implemented.');
  }

  mapFormsToCustomerRequestData(): CustomerRequestData {
    let addPersons: CustomerAddPersonRequestData[];
    this.addPersonForms.forEach((personComponent) => {
      addPersons.push({
        lastname: personComponent.lastname.value,
        firstname: personComponent.firstname.value,
        birthDate: personComponent.birthDate.value,
        income: personComponent.income.value
      });
    });

    const customer = this.customerFormComponent;
    return {
      lastname: customer.lastname.value,
      firstname: customer.firstname.value,
      birthDate: customer.birthDate.value,
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
}
