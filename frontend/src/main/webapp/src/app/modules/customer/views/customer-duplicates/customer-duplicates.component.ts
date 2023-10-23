import {Component, inject, OnInit} from '@angular/core';
import {CustomerApiService, CustomerDuplicatesResponse} from '../../../../api/customer-api.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html'
})
export class CustomerDuplicatesComponent implements OnInit {
  private customerApiService = inject(CustomerApiService);
  private activatedRoute = inject(ActivatedRoute);

  private customerDuplicatesData: CustomerDuplicatesResponse;

  ngOnInit(): void {
    this.customerDuplicatesData = this.activatedRoute.snapshot.data.customerDuplicatesData;

    console.log("DATA", this.customerDuplicatesData);
  }

}
