import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';

@Component({
  selector: 'customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  customerDetailData: CustomerDetailData;

  constructor(
    private route: ActivatedRoute,
    private apiService: CustomerApiService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.apiService.getCustomer(+params['id']).subscribe((customerData) => {
        this.customerDetailData = this.mapCustomerDataForView(customerData);
      });
    });
  }

  private mapCustomerDataForView(customerData: CustomerData): CustomerDetailData {
    return {
      id: customerData.id,
      customerId: customerData.customerId,
      firstname: customerData.firstname,
      lastname: customerData.lastname,
      birthDate: moment(customerData.birthDate).format('DD.MM.YYYY'),
      country: customerData.country, // TODO map to name
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
}

interface CustomerDetailData {
  id?: number;
  customerId?: number;
  firstname: string;
  lastname: string;
  birthDate: string;
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
