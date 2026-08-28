import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatIcon} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {CustomerNoteApiService, CustomerNoteItem, CustomerNotesResponse} from '../../../../../api/customer-note-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {PAGE_SIZE_OPTIONS} from '../../../../../common/api/paged-response';
import {EditNoteDialogComponent} from './edit-note-dialog.component';
import {DeleteNoteDialogComponent} from './delete-note-dialog.component';
import {TafelToastrService} from '../../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../../common/api/problem-detail';
import {registerSvgIcons} from '../../../../../common/util/svg-icon.util';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';

export interface AllNotesDialogData {
  customerId: number;
  initialNotesResponse: CustomerNotesResponse;
}

@Component({
  selector: 'tafel-all-notes-dialog',
  imports: [TafelDialogComponent, MatDialogModule, MatButtonModule, CommonModule, MatPaginatorModule, MatTooltipModule, MatIcon],
  templateUrl: 'all-notes-dialog.component.html',
})
export class AllNotesDialogComponent {
  private readonly registerIcons = registerSvgIcons({
    edit: editIcon,
    delete: deleteIcon
  });

  readonly dialogRef = inject(MatDialogRef<AllNotesDialogComponent>);
  readonly data: AllNotesDialogData = inject(MAT_DIALOG_DATA);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(TafelToastrService);

  notesResponse = signal<CustomerNotesResponse>(this.data.initialNotesResponse);
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  getCustomerNotes(page: number, pageSize?: number) {
    this.customerNoteApiService.getNotesForCustomer(this.data.customerId, page, pageSize).subscribe((response) => {
      this.notesResponse.set(response);
    });
  }

  editNote(noteItem: CustomerNoteItem) {
    this.dialog.open(EditNoteDialogComponent, {
      data: {initialText: noteItem.note}
    }).afterClosed().subscribe((newText) => {
      if (newText) {
        this.customerNoteApiService.updateNote(this.data.customerId, noteItem.id, newText).subscribe({
          next: () => {
            this.getCustomerNotes(this.notesResponse().currentPage, this.notesResponse().pageSize);
            this.toastr.success('Notiz wurde aktualisiert!');
          },
          error: (error: HttpErrorResponse) => {
            this.toastr.error(extractErrorMessage(error), 'Aktualisierung fehlgeschlagen!');
          }
        });
      }
    });
  }

  deleteNote(noteItem: CustomerNoteItem) {
    this.dialog.open(DeleteNoteDialogComponent).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.customerNoteApiService.deleteNote(this.data.customerId, noteItem.id).subscribe({
          next: () => {
            this.getCustomerNotes(this.notesResponse().currentPage, this.notesResponse().pageSize);
            this.toastr.success('Notiz wurde gelöscht!');
          },
          error: (error: HttpErrorResponse) => {
            this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen!');
          }
        });
      }
    });
  }
}
