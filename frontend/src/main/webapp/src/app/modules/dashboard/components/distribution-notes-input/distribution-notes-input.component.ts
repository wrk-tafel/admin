import {Component, effect, inject, input, OnDestroy, OnInit} from '@angular/core';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  InputGroupComponent,
  InputGroupTextDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalToggleDirective,
  RowComponent
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {SelectSheltersComponent} from '../select-shelters/select-shelters.component';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'tafel-distribution-notes-input',
  templateUrl: 'distribution-notes-input.component.html',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    ModalBodyComponent,
    ButtonDirective,
    ButtonCloseDirective,
    ReactiveFormsModule,
    TafelAutofocusDirective,
    CommonModule,
    CardFooterComponent,
    BgColorDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    ModalFooterComponent,
    SelectSheltersComponent,
    FormsModule
  ],
  standalone: true
})
export class DistributionNotesInputComponent implements OnInit, OnDestroy {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastService = inject(ToastService);
  private readonly globalStateService = inject(GlobalStateService);
  private distributionSubscription: Subscription;

  initialNotesData = input<string>();
  notes: string = '';
  inputIsDisabled: boolean = true;

  initialNotesDataEffect = effect(() => {
    this.notes = this.initialNotesData() ?? '';
  });

  ngOnInit() {
    this.distributionSubscription = this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.inputIsDisabled = (distribution == undefined);
    });
  }

  ngOnDestroy(): void {
    if (this.distributionSubscription) {
      this.distributionSubscription.unsubscribe();
    }
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
