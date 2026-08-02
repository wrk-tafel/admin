import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatPaginatorModule} from '@angular/material/paginator';
import {CommonModule} from '@angular/common';
import {CustomerNoteApiService, CustomerNotesResponse} from '../../../../../api/customer-note-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {PAGE_SIZE_OPTIONS} from '../../../../../common/api/paged-response';

export interface AllNotesDialogData {
  customerId: number;
  initialNotesResponse: CustomerNotesResponse;
}

@Component({
  selector: 'tafel-all-notes-dialog',
  imports: [TafelDialogComponent, MatDialogModule, MatButtonModule, CommonModule, MatPaginatorModule],
  templateUrl: 'all-notes-dialog.component.html',
})
export class AllNotesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AllNotesDialogComponent>);
  readonly data: AllNotesDialogData = inject(MAT_DIALOG_DATA);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);

  notesResponse = signal<CustomerNotesResponse>(this.data.initialNotesResponse);
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  getCustomerNotes(page: number, pageSize?: number) {
    this.customerNoteApiService.getNotesForCustomer(this.data.customerId, page, pageSize).subscribe((response) => {
      this.notesResponse.set(response);
    });
  }
}
