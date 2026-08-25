import {Component, computed, effect, inject, input, linkedSignal, signal, viewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {BreakpointObserver} from '@angular/cdk/layout';
import {map} from 'rxjs';
import {Router} from '@angular/router';
import dayjs from 'dayjs';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {
  CustomerAddressData,
  CustomerApiService,
  CustomerData,
  CustomerUpdateResponse
} from '../../../../api/customer-api.service';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import {
  CustomerNoteApiService,
  CustomerNoteItem,
  CustomerNotesResponse
} from '../../../../api/customer-note-api.service';
import {
  CustomerDocumentApiService,
  CustomerDocumentItem,
  CustomerDocumentsResponse,
  documentTypeLabel
} from '../../../../api/customer-document-api.service';
import {DeleteCustomerDialogComponent} from './dialogs/delete-customer-dialog.component';
import {AllNotesDialogComponent} from './dialogs/all-notes-dialog.component';
import {AddNoteDialogComponent} from './dialogs/add-note-dialog.component';
import {LockCustomerDialogComponent} from './dialogs/lock-customer-dialog.component';
import {
  PayCostContributionDialogComponent
} from '../../../../common/components/pay-cost-contribution-dialog/pay-cost-contribution-dialog.component';
import {
  EditCostContributionDialogComponent
} from '../../../../common/components/edit-cost-contribution-dialog/edit-cost-contribution-dialog.component';
import {UploadDocumentPanelComponent, UploadDocumentPanelResult} from './upload-document-panel.component';
import {DeleteDocumentDialogComponent} from './dialogs/delete-document-dialog.component';
import {DistributionTicketApiService} from '../../../../api/distribution-ticket-api.service';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatTabsModule} from '@angular/material/tabs';
import {MatDialog} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {CommonModule} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {FormatIssuerPipe} from '../../../../common/pipes/format-issuer.pipe';
import {FormatCustomerNamePipe} from '../../../../common/pipes/format-customer-name.pipe';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {FormsModule} from '@angular/forms';
import {
  ConfirmCustomerSaveDialog
} from '../../components/confirm-customer-save-dialog/confirm-customer-save-dialog.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {CustomerHistoryComponent} from '../../components/customer-history/customer-history.component';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {relativeTimeLabel} from '../../../../common/util/relative-time.util';
import {
  computeCustomerValidityState,
  customerValidityStateColor,
  customerValidityStateText,
  CustomerValidityState
} from '../../../../common/util/customer-validity.util';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import contentCopyIcon from '@material-symbols/svg-400/outlined/content_copy-fill.svg';
import downloadIcon from '@material-symbols/svg-400/outlined/download-fill.svg';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import progressActivityIcon from '@material-symbols/svg-400/outlined/progress_activity-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import groupIcon from '@material-symbols/svg-400/outlined/group-fill.svg';

// Matches the Tailwind `lg` breakpoint this template's action/tab layout switches at.
const DESKTOP_BREAKPOINT = '(min-width: 1024px)';

@Component({
  selector: 'tafel-customer-detail',
  templateUrl: 'customer-detail.component.html',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatIcon,
    MatTabsModule,
    BirthdateAgePipe,
    GenderLabelPipe,
    FormatIssuerPipe,
    FormatCustomerNamePipe,
    TafelIfDistributionActiveDirective,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    UploadDocumentPanelComponent,
    MatTooltipModule,
    TafelInfoTooltipComponent,
    CustomerHistoryComponent,
    ClipboardModule,
    FormatCustomerAddressPipe
  ]
})
export class CustomerDetailComponent {
  private readonly registerIcons = registerSvgIcons({
    content_copy: contentCopyIcon,
    download: downloadIcon,
    add: addIcon,
    progress_activity: progressActivityIcon,
    delete: deleteIcon,
    group: groupIcon
  });

  // Input signals - aliased to match the route resolver data keys (see customer.routes.ts) since the
  // unaliased names below are already used for the locally-writable linkedSignal counterparts
  // eslint-disable-next-line @angular-eslint/no-input-rename
  customerDataInput = input.required<CustomerData>({alias: 'customerData'});
  // eslint-disable-next-line @angular-eslint/no-input-rename
  customerNotesResponseInput = input.required<CustomerNotesResponse>({alias: 'customerNotesResponse'});
  // eslint-disable-next-line @angular-eslint/no-input-rename
  customerDocumentsResponseInput = input.required<CustomerDocumentsResponse>({alias: 'customerDocumentsResponse'});

  // Writable signals linked to inputs - reset when input changes, locally writable for API updates
  readonly customerData = linkedSignal(() => this.customerDataInput());
  readonly customerNotesResponse = linkedSignal(() => this.customerNotesResponseInput());
  readonly customerDocumentsResponse = linkedSignal(() => this.customerDocumentsResponseInput());

  // Other signals
  customerNotes = signal<CustomerNoteItem[]>([]);
  customerDocuments = signal<CustomerDocumentItem[]>([]);

  // Ticket signals
  ticketNumber = signal<number | null>(null);
  ticketNumberInput = signal<number | null>(null);

  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly customerDocumentApiService = inject(CustomerDocumentApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly distributionTicketApiService = inject(DistributionTicketApiService);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Places the #customerActions template: inside the identity header on desktop, below the tabs on
  // narrow screens. A signal-driven outlet instead of two CSS-hidden copies, so the buttons' menus
  // and testids exist exactly once in the DOM.
  readonly isDesktopLayout = toSignal(
    this.breakpointObserver.observe([DESKTOP_BREAKPOINT]).pipe(map(state => state.matches)),
    {initialValue: this.breakpointObserver.isMatched(DESKTOP_BREAKPOINT)}
  );

  readonly isDistributionActive = computed(() => !!this.globalStateService.getCurrentDistribution()());
  readonly hasAuditPermission = computed(() => this.authenticationService.hasPermission('AUDIT_LOG'));
  readonly hasDocumentsPermission = computed(() => this.authenticationService.hasPermission('CUSTOMER_DOCUMENTS'));

  /** Which PDF is currently being generated, so the triggering print action can show a busy state. */
  readonly printing = signal<'MASTERDATA' | 'IDCARD' | 'PRIVACY_NOTICE' | null>(null);

  /** Whether the GDPR data-takeout download is currently running, so the triggering action can show a busy state. */
  readonly exporting = signal(false);

  readonly validityState = computed(() => computeCustomerValidityState(this.customerData()?.validUntil));
  readonly validityColor = computed(() => customerValidityStateColor(this.validityState()));
  readonly validityText = computed(() => customerValidityStateText(this.validityState()));

  /**
   * Main person plus every additional person not flagged `excludeFromHousehold` - what the identity
   * header's "household size" chip counts, since an excluded person is on the case file but not part
   * of the household it feeds.
   */
  readonly householdSize = computed(() =>
    1 + (this.customerData()?.additionalPersons ?? []).filter(person => !person.excludeFromHousehold).length
  );

  uploadDocumentPanel = viewChild(UploadDocumentPanelComponent);

  constructor() {
    // Process notes when the notes response changes (from input or local updates)
    effect(() => {
      const notesResponse = this.customerNotesResponse();
      if (notesResponse) {
        this.processCustomerNoteResponse(notesResponse);
      }
    });

    // Process documents when the documents response changes (from input or local updates)
    effect(() => {
      const documentsResponse = this.customerDocumentsResponse();
      if (documentsResponse) {
        this.customerDocuments.set(documentsResponse.items);
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
    this.printing.set('MASTERDATA');
    this.customerApiService.generatePdf(this.customerData().id!, 'MASTERDATA').subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.printing.set(null),
      complete: () => this.printing.set(null)
    });
  }

  printIdCard() {
    this.printing.set('IDCARD');
    this.customerApiService.generatePdf(this.customerData().id!, 'IDCARD').subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.printing.set(null),
      complete: () => this.printing.set(null)
    });
  }

  /** Downloads the printable privacy-notice/consent sheet for the customer to sign at intake (GDPR G2). */
  printPrivacyNotice() {
    this.printing.set('PRIVACY_NOTICE');
    this.customerApiService.generatePdf(this.customerData().id!, 'PRIVACY_NOTICE').subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.printing.set(null),
      complete: () => this.printing.set(null)
    });
  }

  /** Downloads the GDPR Art. 15/20 data takeout (issue #3179): one ZIP with the household record (as HTML and PDF) and every document. */
  exportHousehold() {
    this.exporting.set(true);
    this.customerApiService.exportHousehold(this.customerData().id!).subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.exporting.set(false),
      complete: () => this.exporting.set(false)
    });
  }

  /** What "Bezug verlängern" would set `validUntil` to, shown next to each menu item's month count. */
  prolongPreviewDate(months: number): Date {
    return dayjs(this.customerData().validUntil).add(months, 'months').endOf('day').toDate();
  }

  onAddressCopied(success: boolean) {
    if (success) {
      this.toastr.success('Adresse in die Zwischenablage kopiert!');
    } else {
      this.toastr.error('Kopieren in die Zwischenablage fehlgeschlagen!');
    }
  }

  /**
   * How long ago a note was written, for the note card's header - the absolute timestamp stays
   * available as that label's tooltip rather than being replaced outright.
   */
  noteRelativeTime(timestamp: Date | string): string | null {
    return relativeTimeLabel(timestamp);
  }

  formatAddressLine1(address: CustomerAddressData): string {
    const formatted = [
      [address.street, address.houseNumber].join(' ').trim(),
      address.stairway ? 'Stiege ' + address.stairway : undefined,
      address.door ? 'Top ' + address.door : undefined
    ]
      .filter(value => (value?.trim().length ?? 0) > 0)
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
    return !dayjs(this.customerData().validUntil).startOf('day').isBefore(dayjs().startOf('day'));
  }

  openDeleteCustomerDialog() {
    const customer = this.customerData();
    this.dialog.open(DeleteCustomerDialogComponent, {data: {customerName: `${customer.lastname} ${customer.firstname}`}})
      .afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.customerApiService.deleteCustomer(this.customerData().id!, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
          next: async () => {
            this.toastr.success('Kunde wurde gelöscht!');
            await this.router.navigate(['/kunden/suchen']);
          },
          error: (error: HttpErrorResponse) => {
            this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen!');
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
        this.customerApiService.updateCustomer(customerData, true, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
          next: () => {
            this.toastr.success('Kunde wurde verlängert!');
          },
          error: (error: HttpErrorResponse) => {
            this.toastr.error(extractErrorMessage(error), 'Verlängerung fehlgeschlagen!');
          },
        });
      }
    });
  }

  prolongCustomer(countMonths : number) {
    const newValidUntilDate = dayjs(this.customerData().validUntil).add(countMonths, 'months').endOf('day').toDate();
    const updatedCustomerData = {
      ...this.customerData(),
      validUntil: newValidUntilDate
    };

    const observer = {
      next: (response: CustomerUpdateResponse) => {
        const customer = response.data;
        this.customerData.set(customer);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 409) {
          this.openConfirmUpdateCustomerDialog(updatedCustomerData, extractErrorMessage(error));
        } else {
          this.toastr.error(extractErrorMessage(error), 'Verlängerung fehlgeschlagen!');
        }
      },
    };

    this.customerApiService.updateCustomer(updatedCustomerData, false, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe(observer);
  }

  disableCustomer() {
    const updatedCustomerData = {
      ...this.customerData(),
      validUntil: dayjs().subtract(1, 'day').endOf('day').toDate()
    };

    this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(response => {
      const customer = response.data;
      this.customerData.set(customer);
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
        this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(response => {
          const customer = response.data;
          this.customerData.set(customer);
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

    this.customerApiService.updateCustomer(updatedCustomerData, false).subscribe(response => {
      const customer = response.data;
      this.customerData.set(customer);
    });
  }

  openPayCostContributionDialog() {
    this.dialog.open(PayCostContributionDialogComponent, {
      data: {pendingAmount: this.customerData()?.pendingCostContribution ?? 0}
    }).afterClosed().subscribe(amount => {
      if (amount) {
        this.payCostContribution(amount);
      }
    });
  }

  payCostContributionAll() {
    this.payCostContribution(undefined);
  }

  private payCostContribution(amount: number | undefined) {
    this.customerApiService.payCostContribution(this.customerData().id!, amount).subscribe({
      next: (customer) => {
        this.customerData.set(customer);
        this.toastr.success('Unkostenbeitrag wurde aktualisiert!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Aktualisierung fehlgeschlagen!');
      }
    });
  }

  openEditCostContributionDialog() {
    this.dialog.open(EditCostContributionDialogComponent, {
      data: {pendingAmount: this.customerData()?.pendingCostContribution ?? 0}
    }).afterClosed().subscribe(amount => {
      if (amount !== undefined && amount !== null) {
        this.editCostContribution(amount);
      }
    });
  }

  private editCostContribution(amount: number) {
    this.customerApiService.editCostContribution(this.customerData().id!, amount).subscribe({
      next: (customer) => {
        this.customerData.set(customer);
        this.toastr.success('Unkostenbeitrag wurde aktualisiert!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Aktualisierung fehlgeschlagen!');
      }
    });
  }

  openAddNoteDialog() {
    this.dialog.open(AddNoteDialogComponent).afterClosed().subscribe(noteText => {
      if (noteText) {
        const sanitizedText = noteText.replace(/\n/g, '<br/>');
        this.customerNoteApiService.createNewNote(this.customerData().id!, sanitizedText).subscribe(newNoteItem => {
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

  onDocumentUpload(result: UploadDocumentPanelResult) {
    const customerId = this.customerData().id!;
    const upload$ = result.mode === 'upload'
      ? this.customerDocumentApiService.uploadDocument(customerId, result.documentType, result.file)
      : this.customerDocumentApiService.importScannerDocument(customerId, result.fileName, result.documentType);

    upload$.subscribe({
      next: (newDocument) => {
        this.customerDocuments.update(documents => [newDocument, ...documents]);
        const currentResponse = this.customerDocumentsResponse();
        this.customerDocumentsResponse.set({
          ...currentResponse,
          items: [newDocument, ...currentResponse.items]
        });
        this.uploadDocumentPanel()?.reset();
        this.toastr.success('Dokument wurde hochgeladen!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Hochladen fehlgeschlagen!');
      }
    });
  }

  downloadDocument(doc: CustomerDocumentItem) {
    this.customerDocumentApiService.downloadDocument(this.customerData().id!, doc.id).subscribe({
      next: (response) => this.fileHelperService.downloadFile(doc.fileName, response.body!),
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Download fehlgeschlagen!');
      }
    });
  }

  openDeleteDocumentDialog(doc: CustomerDocumentItem) {
    this.dialog.open(DeleteDocumentDialogComponent).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.customerDocumentApiService.deleteDocument(this.customerData().id!, doc.id).subscribe({
          next: () => {
            this.customerDocuments.update(documents => documents.filter(d => d.id !== doc.id));
            const currentResponse = this.customerDocumentsResponse();
            this.customerDocumentsResponse.set({
              ...currentResponse,
              items: currentResponse.items.filter(d => d.id !== doc.id)
            });
            this.toastr.success('Dokument wurde gelöscht!');
          },
          error: (error: HttpErrorResponse) => {
            this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen!');
          }
        });
      }
    });
  }

  assignTicket() {
    const ticketNumber = this.ticketNumberInput()!;
    const customerId = this.customerData().id!;
    this.distributionApiService.assignCustomer(customerId, ticketNumber, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.ticketNumber.set(ticketNumber);
        this.ticketNumberInput.set(null);
        this.toastr.success('Ticket wurde zugewiesen!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Ticket-Zuweisung fehlgeschlagen!');
      }
    });
  }

  deleteTicket() {
    const customerId = this.customerData().id!;
    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(customerId, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.ticketNumber.set(null);
        this.toastr.success('Ticket wurde gelöscht!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Ticket-Löschung fehlgeschlagen!');
      }
    });
  }

  private processCustomerNoteResponse(response: CustomerNotesResponse) {
    this.customerNotes.set(response.items);
  }

  private processFileResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  protected readonly documentTypeLabel = documentTypeLabel;
  protected readonly Number = Number;
  protected readonly CustomerValidityState = CustomerValidityState;
}
