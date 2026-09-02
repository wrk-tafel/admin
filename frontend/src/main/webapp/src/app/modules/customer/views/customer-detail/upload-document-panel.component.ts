import {Component, DestroyRef, ElementRef, inject, output, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatRadioModule} from '@angular/material/radio';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {MatIcon} from '@angular/material/icon';
import {DocumentType, documentTypeLabel} from '../../../../api/customer-document-api.service';
import {DocumentScannerApiService, ScannerFileItem} from '../../../../api/document-scanner-api.service';
import {ConfigApiService} from '../../../../api/config-api.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import visibilityIcon from '@material-symbols/svg-400/outlined/visibility-fill.svg';

export type UploadDocumentPanelResult =
  | { mode: 'upload'; documentType: DocumentType; file: File }
  | { mode: 'scanner'; documentType: DocumentType; fileName: string };

type DocumentSource = 'upload' | 'scanner';

@Component({
  selector: 'tafel-upload-document-panel',
  imports: [
    CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatRadioModule,
    FormsModule, MatIcon
  ],
  templateUrl: 'upload-document-panel.component.html',
})
export class UploadDocumentPanelComponent {
  private readonly registerIcons = registerSvgIcons({visibility: visibilityIcon});

  private readonly documentScannerApiService = inject(DocumentScannerApiService);
  private readonly configApiService = inject(ConfigApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly upload = output<UploadDocumentPanelResult>();

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  documentType = signal<DocumentType | null>(null);
  source = signal<DocumentSource>('upload');

  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  scannerFiles = signal<ScannerFileItem[]>([]);
  selectedScannerFileName = signal<string | null>(null);
  /**
   * Starts out false so the "Scanner" source is only ever offered once the backend has confirmed
   * this deployment actually has a scanner folder - showing it first and retracting it would let a
   * quick click land on a source that doesn't exist here. A config request that fails leaves it
   * false too, which just falls back to the always-available file upload.
   */
  scannerEnabled = signal(false);

  private configSubscription: Subscription | undefined;

  private scannerSubscription: Subscription | undefined;

  protected readonly documentTypeLabel = documentTypeLabel;
  protected readonly documentTypes = Object.values(DocumentType);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.scannerSubscription?.unsubscribe();
      this.configSubscription?.unsubscribe();
    });
    // Answers "does this deployment have a scanner folder?" before the source toggle is drawn, and
    // keeps answering it: the flag can be switched off (or on) in the backend's config file while
    // this panel is open, so the toggle follows the stream rather than a single reply. The file
    // listing and its own SSE stream stay lazy - both are only worth fetching once the user
    // actually switches to the scanner source.
    this.configSubscription = this.configApiService.observeConfig().subscribe((config) => {
      const enabled = config?.scannerFolderEnabled ?? false;
      this.scannerEnabled.set(enabled);

      // The source the user is standing on can disappear underneath them, and the toggle that would
      // let them leave it disappears with it - so put them back on the file upload, which every
      // deployment has, and drop the now-unreachable scanner file they had picked.
      if (!enabled && this.source() === 'scanner') {
        this.source.set('upload');
        this.selectedScannerFileName.set(null);
      }
    });
  }

  selectSource(source: DocumentSource) {
    this.source.set(source);
    if (source === 'scanner' && !this.scannerSubscription) {
      this.refreshScannerFiles();
      this.scannerSubscription = this.documentScannerApiService.listenForScannerFileChanges()
        .subscribe((response) => this.scannerFiles.set(response.items));
    }
  }

  refreshScannerFiles() {
    this.documentScannerApiService.getScannerFiles().subscribe((response) => this.scannerFiles.set(response.items));
  }

  scannerFileContentUrl(fileName: string): string {
    return this.documentScannerApiService.getScannerFileContentUrl(fileName);
  }

  triggerFileInput() {
    this.fileInputRef()?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  canUpload(): boolean {
    if (!this.documentType()) {
      return false;
    }
    return this.source() === 'upload' ? !!this.selectedFile() : !!this.selectedScannerFileName();
  }

  submit() {
    const documentType = this.documentType()!;

    const result: UploadDocumentPanelResult = this.source() === 'upload'
      ? {mode: 'upload', documentType, file: this.selectedFile()!}
      : {mode: 'scanner', documentType, fileName: this.selectedScannerFileName()!};

    this.upload.emit(result);
  }

  /** Puts the panel back into the state it starts in, once an upload it handed over has gone through. */
  reset() {
    this.documentType.set(null);
    this.selectedFile.set(null);
    this.selectedScannerFileName.set(null);

    // An import takes the file it imported out of the scanner folder, and the backend announces
    // that on this panel's SSE stream. That stream is only opened when the scanner source is
    // picked, though, and an import that is through before it has connected misses the
    // announcement - after which nothing republishes the listing until the folder changes again,
    // leaving a file on screen that is no longer there. Re-reading it closes that gap for the one
    // browser that must not miss it: the one that just did the import.
    if (this.source() === 'scanner') {
      this.refreshScannerFiles();
    }
  }
}
