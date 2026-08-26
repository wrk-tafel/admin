import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {DataSubjectMatchType, dataSubjectMatchTypeLabel} from '../../../../../api/data-subject-request-api.service';

export interface DataSubjectRequestDeleteConfirmDialogMatch {
  type: DataSubjectMatchType;
  name: string;
  businessKey: string;
}

export interface DataSubjectRequestDeleteConfirmDialogData {
  matches: DataSubjectRequestDeleteConfirmDialogMatch[];
}

/**
 * Every selected match is hard-deleted through its own area's existing delete flow
 * (household/user/employee) - this only asks once before triggering all of them, listing exactly
 * what is about to go so a household and a staff account selected together aren't confused for one
 * combined record.
 */
@Component({
  selector: 'tafel-data-subject-request-delete-confirm-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'data-subject-request-delete-confirm-dialog.component.html'
})
export class DataSubjectRequestDeleteConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DataSubjectRequestDeleteConfirmDialogComponent>);
  readonly data: DataSubjectRequestDeleteConfirmDialogData = inject(MAT_DIALOG_DATA);
  protected readonly dataSubjectMatchTypeLabel = dataSubjectMatchTypeLabel;
}
