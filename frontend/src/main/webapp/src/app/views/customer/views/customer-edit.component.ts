import { Component } from '@angular/core';
import { AddPersonCardData } from '../components/addperson-card.component';
import { CustomerFormData } from '../components/customer-form.component';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent {
  customerData: CustomerFormData;
  additionalPersonsData: AddPersonCardData[] = [];

  updateCustomerFormData(updatedFormData: CustomerFormData) {
    this.customerData = updatedFormData;
  }

  updatePersonsData(index: number, additionalPersonsData: AddPersonCardData) {
    this.additionalPersonsData[index] = additionalPersonsData;
  }

  addNewPerson() {
    this.additionalPersonsData.push({ id: this.additionalPersonsData.length + 1 });
  }

  removePerson(index: number) {
    this.additionalPersonsData.splice(index, 1);
  }

  trackBy(index: number, personData: AddPersonCardData) {
    return personData.id;
  }
}
