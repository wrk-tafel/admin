import {Component, inject, Input, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import * as moment from 'moment';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {
  CustomerAddressData,
  CustomerApiService,
  CustomerData,
  CustomerIssuer,
  Gender,
  GenderLabel
} from '../../../../api/customer-api.service';
import {HttpResponse} from '@angular/common/http';
import {
  CustomerNoteApiService,
  CustomerNoteItem,
  CustomerNotesResponse
} from '../../../../api/customer-note-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalToggleDirective,
  NavComponent,
  NavItemComponent,
  NavLinkDirective,
  RoundedDirective,
  RowComponent,
  TabContentComponent,
  TabContentRefDirective,
  TabDirective,
  TabPaneComponent,
  TabPanelComponent,
  TabsComponent,
  TabsContentComponent,
  TabsListComponent
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {faPlus, faUsers} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'tafel-customer-detail',
  templateUrl: 'customer-detail.component.html',
  imports: [
    CommonModule,
    DropdownComponent,
    NavComponent,
    NavItemComponent,
    TabContentRefDirective,
    RouterLink,
    TabContentComponent,
    TabPaneComponent,
    CardComponent,
    CardHeaderComponent,
    RowComponent,
    ColComponent,
    CardBodyComponent,
    CardFooterComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    ModalBodyComponent,
    ModalFooterComponent,
    TafelPaginationComponent,
    FormsModule,
    BgColorDirective,
    ButtonCloseDirective,
    ButtonDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownItemDirective,
    DropdownDividerDirective,
    NavLinkDirective,
    RoundedDirective,
    FaIconComponent,
    ReactiveFormsModule,
    TabDirective,
    TabPanelComponent,
    TabsComponent,
    TabsContentComponent,
    TabsListComponent,
  ],
  standalone: true
})
export class CustomerDetailComponent implements OnInit {
  @Input('customerData') customerData: CustomerData;
  @Input('customerNotesResponse') customerNotesResponse: CustomerNotesResponse;

  customerNotes: CustomerNoteItem[];
  customerNotesPaginationData: TafelPaginationData;
  newNoteText: string;
  lockReasonText: string;
  showDeleteCustomerModal = false;
  showAddNewNoteModal = false;
  showAllNotesModal = false;
  showLockCustomerModal = false;
  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.processCustomerNoteResponse(this.customerNotesResponse);
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
    const formatted = [
      [address.street, address.houseNumber].join(' ').trim(),
      address.stairway ? 'Stiege ' + address.stairway : undefined,
      address.door ? 'Top ' + address.door : undefined
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return formatted?.trim().length > 0 ? formatted : '-';
  }

  formatAddressLine2(address: CustomerAddressData): string {
    const formatted = [address.postalCode?.toString(), address.city].join(' ').trim();
    return formatted?.trim().length > 0 ? formatted : '-';
  }

  getFormattedName() {
    if (!this.customerData?.lastname && !this.customerData?.firstname) {
      return '-';
    }
    return [this.customerData?.lastname, this.customerData?.firstname].join(' ');
  }

  getBirthDateAndAge(birthDate?: Date): string {
    if (birthDate) {
      const age = moment().diff(birthDate, 'years');
      return moment(birthDate).format('DD.MM.YYYY') + ' (' + age + ')';
    }
    return '-';
  }

  formatIssuer(issuer: CustomerIssuer): string {
    if (issuer) {
      return 'von ' + issuer.personnelNumber + ' ' + issuer.firstname + ' ' + issuer.lastname;
    }
    return '';
  }

  async editCustomer() {
    await this.router.navigate(['/kunden/bearbeiten', this.customerData.id]);
  }

  isValid(): boolean {
    return !moment(this.customerData.validUntil).startOf('day').isBefore(moment().startOf('day'));
  }

  async deleteCustomer() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: async (response) => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Kunde wurde gelöscht!'});
        await this.router.navigate(['/kunden/suchen']);
      },
      error: error => {
        this.showDeleteCustomerModal = false;
        this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
      },
    };
    await this.customerApiService.deleteCustomer(this.customerData.id).subscribe(observer);
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

  lockCustomer() {
    const updatedCustomerData: CustomerData = {
      ...this.customerData,
      locked: true,
      lockReason: this.lockReasonText
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData = customerData;
      this.lockReasonText = undefined;
      this.showLockCustomerModal = false;
    });
  }

  unlockCustomer() {
    const updatedCustomerData: CustomerData = {
      ...this.customerData,
      locked: false,
      lockedBy: null,
      lockReason: null
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

  getGenderLabel(gender?: Gender): string {
    if (gender) {
      return GenderLabel[gender];
    }
    return '-';
  }

  getCustomerNotes(page: number) {
    this.customerNoteApiService.getNotesForCustomer(this.customerData.id, page).subscribe((response) => {
      this.processCustomerNoteResponse(response);
    });
  }

  private processCustomerNoteResponse(response: CustomerNotesResponse) {
    this.customerNotes = response.items;
    this.customerNotesPaginationData = {
      count: response.items.length,
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      pageSize: response.pageSize
    };
  }

  private processPdfResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body);
  }

  protected readonly faUsers = faUsers;
  protected readonly faPlus = faPlus;
}
