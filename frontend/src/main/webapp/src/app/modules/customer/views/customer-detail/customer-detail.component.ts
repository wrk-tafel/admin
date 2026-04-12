import {Component, computed, effect, inject, input, linkedSignal, signal} from '@angular/core';
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
import {ToastrService} from 'ngx-toastr';
import {DeleteCustomerDialogComponent} from './dialogs/delete-customer-dialog.component';
import {AllNotesDialogComponent} from './dialogs/all-notes-dialog.component';
import {AddNoteDialogComponent} from './dialogs/add-note-dialog.component';
import {LockCustomerDialogComponent} from './dialogs/lock-customer-dialog.component';
import {TafelPaginationData} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {DistributionTicketApiService} from '../../../../api/distribution-ticket-api.service';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';
import {
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
  RowComponent
} from '@coreui/angular';
import {MatTabsModule} from '@angular/material/tabs';
import {MatDialog} from '@angular/material/dialog';
import {CommonModule} from '@angular/common';
import {faPlus, faUsers} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {FormatIssuerPipe} from '../../../../common/pipes/format-issuer.pipe';
import {FormattedCustomerNamePipe} from '../../../../common/pipes/formatted-customer-name.pipe';
import {FormsModule} from '@angular/forms';
import {
  ConfirmCustomerSaveDialog
} from '../../components/confirm-customer-save-dialog/confirm-customer-save-dialog.component';

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
    ButtonDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownItemDirective,
    DropdownDividerDirective,
    FaIconComponent,
    MatTabsModule,
    BirthdateAgePipe,
    GenderLabelPipe,
    FormatIssuerPipe,
    FormattedCustomerNamePipe,
    TafelIfDistributionActiveDirective,
    FormsModule
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

  // Ticket signals
  ticketNumber = signal<number>(null);
  ticketNumberInput = signal<number>(null);

  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly distributionTicketApiService = inject(DistributionTicketApiService);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly globalStateService = inject(GlobalStateService);

  readonly isDistributionActive = computed(() => !!this.globalStateService.getCurrentDistribution()());

  constructor() {
    // Process notes when the notes response changes (from input or local updates)
    effect(() => {
      const notesResponse = this.customerNotesResponse();
      if (notesResponse) {
        this.processCustomerNoteResponse(notesResponse);
      }
    });

    // Fetch current ticket when distribution is active and customer data is loaded
    effect(() => {
      const isActive = this.isDistributionActive();
      const customer = this.customerData();
      if (isActive && customer?.id) {
        this.distributionTicketApiService.getCurrentTicketForCustomer(customer.id).subscribe({
          next: (response) => this.ticketNumber.set(response.ticketNumber),
          error: () => this.ticketNumber.set(null)
        });
      } else {
        this.ticketNumber.set(null);
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

  openDeleteCustomerDialog() {
    this.dialog.open(DeleteCustomerDialogComponent)
      .afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.customerApiService.deleteCustomer(this.customerData().id).subscribe({
          next: async () => {
            this.toastr.success('Kunde wurde gelöscht!');
            await this.router.navigate(['/kunden/suchen']);
          },
          error: () => {
            this.toastr.error('Löschen fehlgeschlagen!');
          },
        });
      }
    });
  }

  openConfirmUpdateCustomerDialog(customerData: CustomerData, message: string) {
    this.dialog.open(ConfirmCustomerSaveDialog, {
      data: {
        message: message
      }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.customerApiService.updateCustomer(customerData, true).subscribe({
          next: () => {
            this.toastr.success('Kunde wurde verlängert!');
          },
          error: () => {
            this.toastr.error('Verlängerung fehlgeschlagen!');
          },
        });
      }
    });
  }

  prolongCustomer(countMonths : number) {
    const newValidUntilDate = moment(this.customerData().validUntil).add(countMonths, 'months').endOf('day').toDate();
    const updatedCustomerData = {
      ...this.customerData(),
      validUntil: newValidUntilDate
    };

    const observer = {
      next: (customerData: CustomerData) => {
        this.customerData.set(customerData);
      },
      error: (error: any) => {
        if (error.status == 409) {
          this.openConfirmUpdateCustomerDialog(updatedCustomerData, error.error.message);
        } else {
          this.toastr.error('Verlängerung fehlgeschlagen!');
        }
      },
    };

    this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(observer);
  }

  disableCustomer() {
    const updatedCustomerData = {
      ...this.customerData(),
      validUntil: moment().subtract(1, 'day').endOf('day').toDate()
    };

    this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(customerData => {
      this.customerData.set(customerData);
    });
  }

  openLockCustomerDialog() {
    this.dialog.open(LockCustomerDialogComponent).afterClosed().subscribe(reason => {
      if (reason) {
        const updatedCustomerData: CustomerData = {
          ...this.customerData(),
          locked: true,
          lockReason: reason
        };
        this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(customerData => {
          this.customerData.set(customerData);
        });
      }
    });
  }

  unlockCustomer() {
    const updatedCustomerData: CustomerData = {
      ...this.customerData(),
      locked: false,
      lockedBy: null,
      lockReason: null
    };

    this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(customerData => {
      this.customerData.set(customerData);
    });
  }

  openAddNoteDialog() {
    this.dialog.open(AddNoteDialogComponent).afterClosed().subscribe(noteText => {
      if (noteText) {
        const sanitizedText = noteText.replace(/\n/g, '<br/>');
        this.customerNoteApiService.createNewNote(this.customerData().id, sanitizedText).subscribe(newNoteItem => {
          this.customerNotes.update(notes => [newNoteItem, ...notes]);
          const currentResponse = this.customerNotesResponse();
          this.customerNotesResponse.set({
            ...currentResponse,
            items: [newNoteItem, ...currentResponse.items],
            totalCount: currentResponse.totalCount + 1
          });
        });
      }
    });
  }

  openAllNotesDialog() {
    this.dialog.open(AllNotesDialogComponent, {
      data: {
        customerId: this.customerData().id,
        initialNotesResponse: this.customerNotesResponse()
      }
    });
  }

  assignTicket() {
    const ticketNumber = this.ticketNumberInput();
    const customerId = this.customerData().id;
    this.distributionApiService.assignCustomer(customerId, ticketNumber).subscribe({
      next: () => {
        this.ticketNumber.set(ticketNumber);
        this.ticketNumberInput.set(null);
        this.toastr.success('Ticket wurde zugewiesen!');
      },
      error: () => {
        this.toastr.error('Ticket-Zuweisung fehlgeschlagen!');
      }
    });
  }

  deleteTicket() {
    const customerId = this.customerData().id;
    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(customerId).subscribe({
      next: () => {
        this.ticketNumber.set(null);
        this.toastr.success('Ticket wurde gelöscht!');
      },
      error: () => {
        this.toastr.error('Ticket-Löschung fehlgeschlagen!');
      }
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
  protected readonly Number = Number;
}
