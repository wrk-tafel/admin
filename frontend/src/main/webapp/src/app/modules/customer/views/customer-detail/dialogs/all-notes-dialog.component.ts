import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {CustomerNoteApiService, CustomerNoteItem, CustomerNotesResponse} from '../../../../../api/customer-note-api.service';
import {TafelPaginationComponent, TafelPaginationData} from '../../../../../common/components/tafel-pagination/tafel-pagination.component';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface AllNotesDialogData {
  customerId: number;
  initialNotesResponse: CustomerNotesResponse;
}

@Component({
  selector: 'tafel-all-notes-dialog',
  imports: [TafelDialogComponent, MatDialogModule, ButtonDirective, CommonModule, TafelPaginationComponent],
  templateUrl: 'all-notes-dialog.component.html',
})
export class AllNotesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AllNotesDialogComponent>);
  readonly data: AllNotesDialogData = inject(MAT_DIALOG_DATA);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);

  customerNotes = signal<CustomerNoteItem[]>([]);
  paginationData = signal<TafelPaginationData>(null);

  constructor() {
    this.processCustomerNoteResponse(this.data.initialNotesResponse);
  }

  getCustomerNotes(page: number) {
    this.customerNoteApiService.getNotesForCustomer(this.data.customerId, page).subscribe((response) => {
      this.processCustomerNoteResponse(response);
    });
  }

  private processCustomerNoteResponse(response: CustomerNotesResponse) {
    this.customerNotes.set(response.items);
    this.paginationData.set({
      count: response.items.length,
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      pageSize: response.pageSize
    });
  }
}
