import {Component, DestroyRef, ElementRef, inject, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {DocumentType, documentTypeLabel} from '../../../../../api/customer-document-api.service';
import {DocumentScannerApiService, ScannerFileItem} from '../../../../../api/document-scanner-api.service';

export type UploadDocumentDialogResult =
  | { mode: 'upload'; documentType: DocumentType; file: File }
  | { mode: 'scanner'; documentType: DocumentType; fileName: string };

type DocumentSource = 'upload' | 'scanner';

@Component({
  selector: 'tafel-upload-document-dialog',
  imports: [TafelDialogComponent, CommonModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatSelectModule, FormsModule],
  templateUrl: 'upload-document-dialog.component.html',
})
export class UploadDocumentDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UploadDocumentDialogComponent>);
  private readonly documentScannerApiService = inject(DocumentScannerApiService);
  private readonly destroyRef = inject(DestroyRef);

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

  canSave(): boolean {
    if (!this.documentType()) {
      return false;
    }
    return this.source() === 'upload' ? !!this.selectedFile() : !!this.selectedScannerFileName();
  }

  save() {
    const documentType = this.documentType()!;

    const result: UploadDocumentDialogResult = this.source() === 'upload'
      ? {mode: 'upload', documentType, file: this.selectedFile()!}
      : {mode: 'scanner', documentType, fileName: this.selectedScannerFileName()!};

    this.dialogRef.close(result);
  }
}
