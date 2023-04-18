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
import {CustomerNoteApiService, CustomerNoteItem} from '../../../../api/customer-note-api.service';

@Component({
  selector: 'tafel-customer-detail',
  templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  customerData: CustomerData;
  customerNotes: CustomerNoteItem[];
  errorMessage: string;
  newNoteText: string;
  showDeleteCustomerModal: boolean = false;
  showAddNewNoteModal: boolean = false;
  showAllNotesModal: boolean = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private customerApiService: CustomerApiService,
    private customerNoteApiService: CustomerNoteApiService,
    private fileHelperService: FileHelperService,
    private router: Router) {
  }

  ngOnInit(): void {
    this.customerData = this.activatedRoute.snapshot.data.customerData;
    this.customerNotes = this.activatedRoute.snapshot.data.customerNotes;
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
    this.customerApiService.deleteCustomer(this.customerData.id).subscribe(response => {
        this.router.navigate(['/kunden/suchen']);
      },
      error => {
        this.showDeleteCustomerModal = false;
        this.errorMessage = 'Löschen fehlgeschlagen!';
      });
  }

  prolongCustomer(countMonths: number) {
    const newValidUntilDate = moment(this.customerData.validUntil).add(countMonths, 'months').endOf('day').toDate();
    const updatedCustomerData = {
      ...this.customerData,
      validUntil: newValidUntilDate
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData = customerData;
    });
  }

  invalidateCustomer() {
    const updatedCustomerData = {
      ...this.customerData,
      validUntil: moment().subtract(1, 'day').endOf('day').toDate()
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData = customerData;
    });
  }

  addNewNote() {
    const sanitizedText = this.newNoteText.replace(/\n/g, '<br/>');
    this.customerNoteApiService.createNewNote(this.customerData.id, sanitizedText).subscribe(newNoteItem => {
      this.customerNotes.unshift(newNoteItem);
      this.newNoteText = undefined;
      this.showAddNewNoteModal = false;
    });
  }

}
