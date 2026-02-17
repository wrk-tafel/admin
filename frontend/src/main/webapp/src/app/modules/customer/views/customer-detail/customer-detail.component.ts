import {Component, effect, inject, input, linkedSignal, signal} from '@angular/core';
import {Router} from '@angular/router';
import moment from 'moment';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {CustomerAddressData, CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
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
  RowComponent,
  TabDirective,
  TabPanelComponent,
  TabsComponent,
  TabsContentComponent,
  TabsListComponent
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {faPlus, faUsers} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {FormatIssuerPipe} from '../../../../common/pipes/format-issuer.pipe';
import {FormattedCustomerNamePipe} from '../../../../common/pipes/formatted-customer-name.pipe';

@Component({
    selector: 'tafel-customer-detail',
    templateUrl: 'customer-detail.component.html',
    imports: [
        CommonModule,
        DropdownComponent,
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
        FaIconComponent,
        ReactiveFormsModule,
        TabDirective,
        TabPanelComponent,
        TabsComponent,
        TabsContentComponent,
        TabsListComponent,
        BirthdateAgePipe,
        GenderLabelPipe,
        FormatIssuerPipe,
        FormattedCustomerNamePipe
    ]
})
export class CustomerDetailComponent {
  // Input signals
  customerDataInput = input.required<CustomerData>({alias: 'customerData'});
  customerNotesResponseInput = input.required<CustomerNotesResponse>({alias: 'customerNotesResponse'});

  // Writable signals linked to inputs - reset when input changes, locally writable for API updates
  readonly customerData = linkedSignal(() => this.customerDataInput());
  readonly customerNotesResponse = linkedSignal(() => this.customerNotesResponseInput());

  // Other signals
  customerNotes = signal<CustomerNoteItem[]>([]);
  customerNotesPaginationData = signal<TafelPaginationData>(null);
  newNoteText = signal<string>(null);
  lockReasonText = signal<string>(null);
  showDeleteCustomerModal = signal(false);
  showAddNewNoteModal = signal(false);
  showAllNotesModal = signal(false);
  showLockCustomerModal = signal(false);

  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  constructor() {
    // Process notes when the notes response changes (from input or local updates)
    effect(() => {
      const notesResponse = this.customerNotesResponse();
      if (notesResponse) {
        this.processCustomerNoteResponse(notesResponse);
      }
    });
  }

  printMasterdata() {
    this.customerApiService.generatePdf(this.customerData().id, 'MASTERDATA')
      .subscribe((response) => this.processPdfResponse(response));
  }

  printIdCard() {
    this.customerApiService.generatePdf(this.customerData().id, 'IDCARD')
      .subscribe((response) => this.processPdfResponse(response));
  }

  printCombined() {
    this.customerApiService.generatePdf(this.customerData().id, 'COMBINED')
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

  async editCustomer() {
    await this.router.navigate(['/kunden/bearbeiten', this.customerData().id]);
  }

  isValid(): boolean {
    return !moment(this.customerData().validUntil).startOf('day').isBefore(moment().startOf('day'));
  }

  async deleteCustomer() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: async (response) => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Kunde wurde gelöscht!'});
        await this.router.navigate(['/kunden/suchen']);
      },
      error: error => {
        this.showDeleteCustomerModal.set(false);
        this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
      },
    };
    await this.customerApiService.deleteCustomer(this.customerData().id).subscribe(observer);
  }

  prolongCustomer(countMonths: number) {
    const newValidUntilDate = moment(this.customerData().validUntil).add(countMonths, 'months').endOf('day').toDate();
    const updatedCustomerData = {
      ...this.customerData(),
      validUntil: newValidUntilDate
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData.set(customerData);
    });
  }

  invalidateCustomer() {
    const updatedCustomerData = {
      ...this.customerData(),
      validUntil: moment().subtract(1, 'day').endOf('day').toDate()
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData.set(customerData);
    });
  }

  lockCustomer() {
    const updatedCustomerData: CustomerData = {
      ...this.customerData(),
      locked: true,
      lockReason: this.lockReasonText()
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData.set(customerData);
      this.lockReasonText.set(null);
      this.showLockCustomerModal.set(false);
    });
  }

  unlockCustomer() {
    const updatedCustomerData: CustomerData = {
      ...this.customerData(),
      locked: false,
      lockedBy: null,
      lockReason: null
    };

    this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
      this.customerData.set(customerData);
    });
  }

  addNewNote() {
    const sanitizedText = this.newNoteText().replace(/\n/g, '<br/>');
    this.customerNoteApiService.createNewNote(this.customerData().id, sanitizedText).subscribe(newNoteItem => {
      this.customerNotes.update(notes => [newNoteItem, ...notes]);
      this.newNoteText.set(null);
      this.showAddNewNoteModal.set(false);
    });
  }

  getCustomerNotes(page: number) {
    this.customerNoteApiService.getNotesForCustomer(this.customerData().id, page).subscribe((response) => {
      this.processCustomerNoteResponse(response);
    });
  }

  private processCustomerNoteResponse(response: CustomerNotesResponse) {
    this.customerNotes.set(response.items);
    this.customerNotesPaginationData.set({
      count: response.items.length,
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      pageSize: response.pageSize
    });
  }

  private processPdfResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body);
  }

  protected readonly faUsers = faUsers;
  protected readonly faPlus = faPlus;
}
