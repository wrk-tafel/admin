import {Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import {concat} from 'rxjs';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {CustomerApiService, IdCardFormat} from '../../../../../api/customer-api.service';
import {ConfigApiService} from '../../../../../api/config-api.service';
import {FileHelperService} from '../../../../../common/util/file-helper.service';
import {parseContentDispositionFilename} from '../../../../../common/util/content-disposition.util';
import {TafelToastrService} from '../../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../../common/http/suppress-error-toast.token';

export interface DigitalIdCardDialogData {
  customerId: number;
  /** The address stored on the customer - the only one a card is ever mailed to. */
  email?: string | null;
}

interface FormatOption {
  format: IdCardFormat;
  label: string;
  hint: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {format: 'PDF', label: 'PDF', hint: 'Lässt sich auf jedem Gerät öffnen und ausdrucken.'},
  {format: 'IMAGE', label: 'Bild', hint: 'Zum Speichern in den Fotos am Handy.'},
  {format: 'WALLET', label: 'Wallet-Karte (Android)', hint: 'Datei für Wallet-Apps auf Android, nicht für iPhones.'},
];

/**
 * Hands out the ID card for a phone: the formats are picked once and then either downloaded or
 * mailed to the address stored on the customer. Which formats and whether mailing exist at all is
 * the deployment's configuration, followed live - see {@link ConfigApiService.observeConfig}.
 */
@Component({
  selector: 'tafel-digital-id-card-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatCheckboxModule],
  templateUrl: 'digital-id-card-dialog.component.html',
})
export class DigitalIdCardDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DigitalIdCardDialogComponent>);
  readonly data: DigitalIdCardDialogData = inject(MAT_DIALOG_DATA);
  private readonly customerApiService = inject(CustomerApiService);
  private readonly configApiService = inject(ConfigApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly toastr = inject(TafelToastrService);

  private readonly config = toSignal(this.configApiService.observeConfig(), {initialValue: null});

  readonly mailEnabled = computed(() => this.config()?.idCardMailEnabled ?? false);
  readonly formatOptions = computed(() =>
    FORMAT_OPTIONS.filter(option => option.format !== 'WALLET' || (this.config()?.walletPassEnabled ?? false))
  );

  private readonly selection = signal<ReadonlySet<IdCardFormat>>(new Set<IdCardFormat>(['PDF']));

  /**
   * What is selected *and* still offered - a wallet card that was ticked stops counting the moment
   * the deployment switches the format off underneath the open dialog.
   */
  readonly selectedFormats = computed(() =>
    this.formatOptions().map(option => option.format).filter(format => this.selection().has(format))
  );

  /** Which of the two actions is running, so both stay locked until it is through. */
  readonly busy = signal<'download' | 'mail' | null>(null);

  readonly hasEmail = computed(() => !!this.data.email?.trim());
  readonly canDownload = computed(() => this.selectedFormats().length > 0 && !this.busy());
  readonly canSend = computed(() => this.canDownload() && this.hasEmail());

  isSelected(format: IdCardFormat): boolean {
    return this.selection().has(format);
  }

  toggle(format: IdCardFormat, selected: boolean) {
    const next = new Set(this.selection());
    if (selected) {
      next.add(format);
    } else {
      next.delete(format);
    }
    this.selection.set(next);
  }

  download() {
    this.busy.set('download');
    // One after the other: a browser asked to save several files at the same instant tends to
    // keep the first and block the rest.
    concat(...this.selectedFormats().map(format =>
      this.customerApiService.getIdCard(this.data.customerId, format, SUPPRESS_ERROR_TOAST_CONTEXT)
    )).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
        this.fileHelperService.downloadFile(filename, response.body!);
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(null);
        this.toastr.error(extractErrorMessage(error), 'Ausweis konnte nicht erstellt werden!');
      },
      complete: () => this.busy.set(null)
    });
  }

  send() {
    this.busy.set('mail');
    this.customerApiService.sendIdCardByMail(this.data.customerId, this.selectedFormats(), SUPPRESS_ERROR_TOAST_CONTEXT)
      .subscribe({
        next: () => {
          this.toastr.success(`Ausweis wurde an ${this.data.email!.trim()} gesendet!`);
          this.dialogRef.close();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(null);
          this.toastr.error(extractErrorMessage(error), 'Senden fehlgeschlagen!');
        }
      });
  }
}
