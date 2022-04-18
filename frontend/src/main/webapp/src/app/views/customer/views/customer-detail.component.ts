import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { CustomerAddPersonData, CustomerApiService, CustomerData } from '../api/customer-api.service';

@Component({
  selector: 'customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  customerDetailData: CustomerDetailData;
  additionalPersonsDetailData: AddPersonDetailData[] = [];

  constructor(
    private route: ActivatedRoute,
    private customerApiService: CustomerApiService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.customerApiService.getCustomer(+params['id']).subscribe((customerData) => {
        this.customerDetailData = this.mapCustomerDataForView(customerData);
        customerData.additionalPersons.map((addPers) => {
          this.additionalPersonsDetailData.push(this.mapAddPersonDataForView(addPers));
        });
      });
    });
  }

  private mapCustomerDataForView(customerData: CustomerData): CustomerDetailData {
    return {
      id: customerData.id,
      customerId: customerData.customerId,
      firstname: customerData.firstname,
      lastname: customerData.lastname,
      birthDateAge: moment(customerData.birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(customerData.birthDate, 'years') + ')',
      country: customerData.country.name,
      telephoneNumber: customerData.telephoneNumber,
      email: customerData.email,
      addressStreet: customerData.address.street,
      addressHouseNumber: customerData.address.houseNumber,
      addressStairway: customerData.address.stairway,
      addressDoor: customerData.address.door,
      addressPostalCode: customerData.address.postalCode,
      addressCity: customerData.address.city,
      employer: customerData.employer,
      income: customerData.income,
      incomeDue: moment(customerData.incomeDue).format('DD.MM.YYYY')
    }
  }

  private mapAddPersonDataForView(addPerson: CustomerAddPersonData): AddPersonDetailData {
    return {
      lastname: addPerson.lastname,
      firstname: addPerson.firstname,
      birthDateAge: moment(addPerson.birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(addPerson.birthDate, 'years') + ')',
      income: addPerson.income
    };
  }

}

interface CustomerDetailData {
  id?: number;
  customerId?: number;
  firstname: string;
  lastname: string;
  birthDateAge: string;
  country: string;
  telephoneNumber: number;
  email: string;
  addressStreet: string;
  addressHouseNumber: string;
  addressStairway: string;
  addressDoor: string;
  addressPostalCode: number;
  addressCity: string;
  employer: string;
  income: number;
  incomeDue: string;
}

interface AddPersonDetailData {
  firstname: string;
  lastname: string;
  birthDateAge: string;
  income?: number;
}
