import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import * as moment from 'moment';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {
  CustomerAddressData,
  CustomerApiService,
  CustomerData,
  CustomerIssuer
} from '../../../../api/customer-api.service';
import {HttpResponse} from '@angular/common/http';

@Component({
  selector: 'tafel-customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  customerData: CustomerData;

  constructor(
    private activatedRoute: ActivatedRoute,
    private customerApiService: CustomerApiService,
    private fileHelperService: FileHelperService,
    private router: Router) {
  }

  ngOnInit(): void {
    this.customerData = this.activatedRoute.snapshot.data.customerData;
  }

  printMasterdata() {
    this.customerApiService.generatePdf(this.customerData.id, 'MASTERDATA')
      .subscribe((response) => this.processPdfResponse(response));
  }

  printIdCard() {
    this.customerApiService.generatePdf(this.customerData.id, 'IDCARD')
      .subscribe((response) => this.processPdfResponse(response));
  }

  printCombined() {
    this.customerApiService.generatePdf(this.customerData.id, 'COMBINED')
      .subscribe((response) => this.processPdfResponse(response));
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

  getAge(birthDate: Date): number {
    if (birthDate) {
      return moment().diff(birthDate, 'years');
    }
    return null;
  }

  formatIssuer(issuer: CustomerIssuer): string {
    if (issuer) {
      return issuer.personnelNumber + ' ' + issuer.firstname + ' ' + issuer.lastname;
    }
    return '';
  }

  editCustomer() {
    this.router.navigate(['/kunden/bearbeiten', this.customerData.id]);
  }

  isValid(): Boolean {
    return !moment(this.customerData.validUntil).isBefore(moment().startOf('day'));
  }

  private processPdfResponse(response: HttpResponse<ArrayBuffer>) {
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    const data = new Blob([response.body], {type: 'application/pdf'});
    this.fileHelperService.downloadFile(filename, data);
  }

  deleteCustomer() {
    // TODO add errorMsg
    this.customerApiService.deleteCustomer(this.customerData.id).subscribe();
  }

}
