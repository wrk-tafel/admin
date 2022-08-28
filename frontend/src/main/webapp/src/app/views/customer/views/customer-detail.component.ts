import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { FileHelperService } from '../../../common/util/file-helper.service';
import { CustomerAddressData, CustomerApiService, CustomerData } from '../api/customer-api.service';

@Component({
  selector: 'customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  customerData: CustomerData;

  constructor(
    private route: ActivatedRoute,
    private customerApiService: CustomerApiService,
    private fileHelperService: FileHelperService) { }

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

  formatAddressLine(address: CustomerAddressData): string {
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

  formatBirthDateAge(birthDate: Date): string {
    return moment(birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(birthDate, 'years') + ')'
  }

}
