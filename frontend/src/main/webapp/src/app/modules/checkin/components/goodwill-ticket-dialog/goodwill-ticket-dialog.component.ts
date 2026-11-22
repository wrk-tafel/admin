import {Component, computed, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../common/components/tafel-dialog/tafel-dialog.component';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {GoodwillTicketRequest} from '../../../../api/distribution-api.service';

/**
 * Asks for what a goodwill package ("Kulanzpaket") needs - a ticket number and how many persons it is
 * for - and closes with the {@link GoodwillTicketRequest}, or with nothing when cancelled. The person
 * is deliberately not asked for: they are not a registered customer, so nothing about them is stored.
 */
@Component({
  selector: 'tafel-goodwill-ticket-dialog',
  imports: [TafelDialogComponent, TafelAutofocusDirective, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'goodwill-ticket-dialog.component.html',
})
export class GoodwillTicketDialogComponent {
  readonly dialogRef = inject(MatDialogRef<GoodwillTicketDialogComponent, GoodwillTicketRequest>);

  ticketNumber = signal<number | null>(null);
  personCount = signal<number | null>(1);
  infantCount = signal<number | null>(0);

  readonly tooManyInfants = computed(() => (this.infantCount() ?? 0) > (this.personCount() ?? 0));

  readonly valid = computed(() => {
    const ticketNumber = this.ticketNumber();
    const personCount = this.personCount();
    const infantCount = this.infantCount();
    return isWholeNumber(ticketNumber) && ticketNumber > 0 &&
      isWholeNumber(personCount) && personCount > 0 && personCount <= 99 &&
      isWholeNumber(infantCount) && infantCount >= 0 &&
      !this.tooManyInfants();
  });

  confirm() {
    if (!this.valid()) {
      return;
    }
    this.dialogRef.close({
      ticketNumber: this.ticketNumber()!,
      personCount: this.personCount()!,
      infantCount: this.infantCount()!
    });
  }
}

function isWholeNumber(value: number | null): value is number {
  return value !== null && Number.isInteger(value);
}
