import {Component, computed, inject, input, linkedSignal} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';
import {FormsModule} from '@angular/forms';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import { ToastrService } from 'ngx-toastr';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
    selector: 'tafel-distribution-notes-input',
    templateUrl: 'distribution-notes-input.component.html',
    imports: [
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent,
        ButtonDirective,
        CardFooterComponent,
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

  readonly distribution = this.globalStateService.getCurrentDistribution();
  readonly inputIsDisabled = computed(() => this.distribution() === undefined);

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

  isSaveDisabled() {
    return this.notes().trim().length <= 0;
  }

}
