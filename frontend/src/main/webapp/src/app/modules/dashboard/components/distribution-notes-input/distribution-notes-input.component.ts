import {Component, effect, inject, input, OnInit} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';

import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
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
    ReactiveFormsModule,
    CardFooterComponent,
    FormsModule
]
})
export class DistributionNotesInputComponent implements OnInit {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastService = inject(ToastService);
  private readonly globalStateService = inject(GlobalStateService);

  initialNotesData = input<string>();
  notes: string = '';
  inputIsDisabled: boolean = true;

  initialNotesDataEffect = effect(() => {
    this.notes = this.initialNotesData() ?? '';
  });

  ngOnInit() {
    this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.inputIsDisabled = (distribution == undefined);
    });
  }

  save() {
    const observer = {
      next: () => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Anmerkungen gespeichert!'});
      },
      error: error => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
      },
    };

    this.distributionApiService.saveNotes(this.notes).subscribe(observer);
  }

  isSaveDisabled() {
    return this.notes.trim().length <= 0;
  }

}
