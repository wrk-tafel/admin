import {Component, DestroyRef, ElementRef, inject, output, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {faEye} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {DocumentType, documentTypeLabel} from '../../../../api/customer-document-api.service';
import {DocumentScannerApiService, ScannerFileItem} from '../../../../api/document-scanner-api.service';
import {ConfigApiService} from '../../../../api/config-api.service';

export type UploadDocumentPanelResult =
  | { mode: 'upload'; documentType: DocumentType; file: File }
  | { mode: 'scanner'; documentType: DocumentType; fileName: string };

type DocumentSource = 'upload' | 'scanner';

@Component({
  selector: 'tafel-upload-document-panel',
  imports: [
    CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatFormFieldModule, MatSelectModule, FormsModule, FaIconComponent
  ],
  templateUrl: 'upload-document-panel.component.html',
})
export class UploadDocumentPanelComponent {
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

  private scannerSubscription: Subscription | undefined;

  protected readonly documentTypeLabel = documentTypeLabel;
  protected readonly documentTypes = Object.values(DocumentType);
  protected readonly faEye = faEye;

  constructor() {
    this.destroyRef.onDestroy(() => this.scannerSubscription?.unsubscribe());
    // Answers "does this deployment have a scanner folder?" before the source toggle is drawn. The
    // file listing and its SSE stream stay lazy - both are only worth fetching once the user
    // actually switches to the scanner source.
    this.configApiService.getConfig().subscribe((config) => this.scannerEnabled.set(config?.scannerFolderEnabled ?? false));
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

  reset() {
    this.documentType.set(null);
    this.selectedFile.set(null);
    this.selectedScannerFileName.set(null);
  }
}
