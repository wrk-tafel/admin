import {Component, computed, inject, input, linkedSignal, Signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatInput} from '@angular/material/input';
import {MatFormField} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {ToastrService} from 'ngx-toastr';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-distribution-notes-input',
  templateUrl: 'distribution-notes-input.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatInput,
    MatButton,
    MatCardFooter,
    FormsModule
  ]
})
export class DistributionNotesInputComponent {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastr = inject(ToastrService);
  private readonly globalStateService = inject(GlobalStateService);

  initialNotesData = input<string>();

  // Writable signal that resets to input value when it changes, but can be locally edited
  notes = linkedSignal(() => this.initialNotesData() ?? '');

  readonly distribution: Signal<DistributionItem | null> = this.globalStateService.getCurrentDistribution();
  readonly inputIsDisabled = computed(() => this.distribution() === null);

  save() {
    const observer = {
      next: () => {
        this.toastr.success('Anmerkungen gespeichert!');
      },
      error: error => {
        this.toastr.error('Speichern fehlgeschlagen!');
      },
    };

    this.distributionApiService.saveNotes(this.notes()).subscribe(observer);
  }

}
