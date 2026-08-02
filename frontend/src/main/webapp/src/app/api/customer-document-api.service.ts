import {HttpClient, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class CustomerDocumentApiService {
  private http = inject(HttpClient);

  getDocumentsForCustomer(customerId: number): Observable<CustomerDocumentsResponse> {
    return this.http.get<CustomerDocumentsResponse>(`/households/${customerId}/documents`);
  }

  uploadDocument(customerId: number, documentType: DocumentType, file: File, personId?: number): Observable<CustomerDocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (personId) {
      formData.append('personId', personId.toString());
    }
    return this.http.post<CustomerDocumentItem>(`/households/${customerId}/documents`, formData);
  }

  importScannerDocument(
    customerId: number, fileName: string, documentType: DocumentType, personId?: number
  ): Observable<CustomerDocumentItem> {
    const request: ImportScannerDocumentRequest = {fileName, documentType, personId};
    return this.http.post<CustomerDocumentItem>(`/households/${customerId}/documents/from-scanner-file`, request);
  }

  downloadDocument(customerId: number, documentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`/households/${customerId}/documents/${documentId}`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  deleteDocument(customerId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(`/households/${customerId}/documents/${documentId}`);
  }
}

export interface CustomerDocumentsResponse {
  items: CustomerDocumentItem[];
}

export interface CustomerDocumentItem {
  id: number;
  documentType: DocumentType;
  fileName: string;
  uploadedAt: Date;
  uploadedBy?: string;
  personId?: number;
}

export enum DocumentType {
  PROOF_OF_INCOME = 'PROOF_OF_INCOME',
  ID = 'ID',
  OTHER = 'OTHER'
}

export const documentTypeLabel: { [key in DocumentType]: string } = {
  [DocumentType.PROOF_OF_INCOME]: 'Einkommensnachweis',
  [DocumentType.ID]: 'Ausweis',
  [DocumentType.OTHER]: 'Sonstiges'
};

interface ImportScannerDocumentRequest {
  fileName: string;
  documentType: DocumentType;
  personId?: number;
}
