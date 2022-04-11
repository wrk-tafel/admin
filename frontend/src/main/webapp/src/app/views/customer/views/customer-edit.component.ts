import { Component, Output, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, AddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';
import { CustomerRequestData, CustomerApiService, CustomerAddPersonRequestData, ValidateCustomerResponse } from '../api/customer-api.service';
import { ModalDirective } from 'ngx-bootstrap/modal';

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
  @ViewChild('validationResultModal') public validationResultModal: ModalDirective;

  customerData: CustomerFormData = {
    lastname: 'Prantl',
    firstname: 'Stephan',
    birthDate: new Date(1987, 6, 14, 0, 0, 0),
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

  // TODO add listener to forms (-> saveState=false)

  additionalPersonsData: AddPersonFormData[] = [];
  validationResult: ValidateCustomerResponse;

  @Output() saveDisabled: boolean = true;
  @Output() errorMessage: string;

  updateCustomerFormData(updatedFormData: CustomerFormData) {
    this.customerData = updatedFormData;
  }

  updatePersonsData(index: number, additionalPersonsData: AddPersonFormData) {
    this.additionalPersonsData[index] = additionalPersonsData;
  }

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

  validate() {
    this.saveDisabled = true;
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
        this.validationResult = result;
        this.saveDisabled = !result.valid;
        this.validationResultModal.show();
      });
    }
  }

  save() {
    console.log("SAVE");
    const customerData = this.mapFormsToCustomerRequestData();
    this.apiService.createCustomer(customerData).subscribe();
  }

  mapFormsToCustomerRequestData(): CustomerRequestData {
    let addPersons = this.addPersonForms.map<CustomerAddPersonRequestData>((personComponent) => {
      return {
        lastname: personComponent.lastname.value,
        firstname: personComponent.firstname.value,
        birthDate: personComponent.birthDate.value,
        income: personComponent.income.value
      }
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
