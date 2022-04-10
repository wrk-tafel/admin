import { Component } from '@angular/core';
import { AddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormData } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent {
  customerData: CustomerFormData;
  additionalPersonsData: AddPersonFormData[] = [];

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
}
