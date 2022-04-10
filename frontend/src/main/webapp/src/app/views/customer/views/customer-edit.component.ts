import { Component, Output, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, AddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent {
  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChildren(AddPersonFormComponent) addPersonCards: AddPersonFormComponent[];

  customerData: CustomerFormData;
  additionalPersonsData: AddPersonFormData[] = [];
  saveDisabled: boolean = true;

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

  save() {
    this.customerFormComponent.customerForm.markAllAsTouched();
    const customerFormValid = this.customerFormComponent.customerForm.valid;

    let addPersonFormsValid = true;
    this.addPersonCards.map<FormGroup>((cmp) => { return cmp.personForm })
      .forEach((form: FormGroup) => {
        form.markAllAsTouched();
        addPersonFormsValid &&= form.valid;
      });

    console.log("CUSTOMER VALID", customerFormValid);
    console.log("PERSONS VALID", addPersonFormsValid);

    if (!customerFormValid || !addPersonFormsValid) {
      this.errorMessage = "Bitte Eingaben überprüfen!";
    } else {
      this.errorMessage = null;
    }
  }
}
