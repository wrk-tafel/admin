import {Component, DestroyRef, ElementRef, inject, output, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {DocumentType, documentTypeLabel} from '../../../../api/customer-document-api.service';
import {DocumentScannerApiService, ScannerFileItem} from '../../../../api/document-scanner-api.service';

export type UploadDocumentPanelResult =
  | { mode: 'upload'; documentType: DocumentType; file: File }
  | { mode: 'scanner'; documentType: DocumentType; fileName: string };

type DocumentSource = 'upload' | 'scanner';

@Component({
  selector: 'tafel-upload-document-panel',
  imports: [CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatFormFieldModule, MatSelectModule, FormsModule],
  templateUrl: 'upload-document-panel.component.html',
})
export class UploadDocumentPanelComponent {
  private readonly documentScannerApiService = inject(DocumentScannerApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly upload = output<UploadDocumentPanelResult>();

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  documentType = signal<DocumentType | null>(null);
  source = signal<DocumentSource>('upload');

  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  scannerFiles = signal<ScannerFileItem[]>([]);
  selectedScannerFileName = signal<string | null>(null);

  private scannerSubscription: Subscription | undefined;

  protected readonly documentTypeLabel = documentTypeLabel;
  protected readonly documentTypes = Object.values(DocumentType);

  constructor() {
    this.destroyRef.onDestroy(() => this.scannerSubscription?.unsubscribe());
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
