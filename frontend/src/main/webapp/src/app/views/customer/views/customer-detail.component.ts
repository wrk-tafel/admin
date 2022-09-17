import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { DateHelperService } from '../../../common/util/date-helper.service';
import { FileHelperService } from '../../../common/util/file-helper.service';
import { CustomerAddressData, CustomerApiService, CustomerData } from '../api/customer-api.service';

@Component({
  selector: 'tafel-customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private customerApiService: CustomerApiService,
    private fileHelperService: FileHelperService,
    private dateHelper: DateHelperService,
    private router: Router) { }

  customerData: CustomerData;
  formatDate = this.dateHelper.formatDate;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.customerApiService.getCustomer(+params['id']).subscribe((customerData) => {
        this.customerData = customerData;
      });
    });
  }

  printMasterdata() {
    this.customerApiService.generateMasterdataPdf(this.customerData.id)
      .subscribe((response) => {
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
        const data = new Blob([response.body], { type: 'application/pdf' });
        this.fileHelperService.downloadFile(filename, data);
      });
  }

  formatAddressLine1(address: CustomerAddressData): string {
    let addressLine = address.street;
    addressLine += ' ' + address.houseNumber;
    if (address.stairway) {
      addressLine += ', Stiege ' + address.stairway;
    }
    if (address.door) {
      addressLine += ', Top ' + address.door;
    }
    return addressLine;
  }

  formatAddressLine2(address: CustomerAddressData): string {
    return address.postalCode + ' ' + address.city;
  }

  formatBirthDateAge(birthDate: Date): string {
    if (birthDate) {
      return this.formatDate(birthDate) + ' (' + moment().diff(birthDate, 'years') + ')';
    }
    return '';
  }

  editCustomer() {
    this.router.navigate(['/kunden/bearbeiten', this.customerData.id]);
  }

}
