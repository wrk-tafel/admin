import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';

@Component({
  selector: 'customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  customerData: CustomerData;

  constructor(
    private route: ActivatedRoute,
    private apiService: CustomerApiService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.apiService.getCustomer(+params['id']).subscribe((customerData) => {
        this.customerData = customerData;
      });
    });
  }
}
