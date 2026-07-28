import {Component, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-lock-customer-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'lock-customer-dialog.component.html',
})
export class LockCustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LockCustomerDialogComponent>);
  reasonText = signal<string | null>(null);
}
