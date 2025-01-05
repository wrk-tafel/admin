import {Component, effect, inject, input} from '@angular/core';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  ModalBodyComponent,
  ModalComponent,
  ModalHeaderComponent,
  ModalToggleDirective,
  RowComponent
} from '@coreui/angular';
import {CommonModule, NgIf} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';

@Component({
  selector: 'tafel-distribution-statistics-input',
  templateUrl: 'distribution-statistics-input.component.html',
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
    NgIf,
    ButtonDirective,
    ButtonCloseDirective,
    ReactiveFormsModule,
    TafelAutofocusDirective,
    CommonModule,
    CardFooterComponent,
    BgColorDirective
  ],
  standalone: true
})
export class DistributionStatisticsInputComponent {
  private readonly fb = inject(FormBuilder);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastService = inject(ToastService);

  employeeCountInput = input<number>();
  personsInShelterCountInput = input<number>();

  form = this.fb.group({
    employeeCount: this.fb.control<number>(null, [Validators.required, Validators.min(1)]),
    personsInShelterCount: this.fb.control<number>(null, [Validators.required, Validators.min(1)])
  })

  employeeCountInputEffect = effect(() => {
    const employeeCount = this.employeeCountInput();
    this.form.patchValue({'employeeCount': employeeCount});
  });

  personsInShelterCountInputEffect = effect(() => {
    const personsInShelterCount = this.personsInShelterCountInput();
    this.form.patchValue({'personsInShelterCount': personsInShelterCount});
  });

  save() {
    const observer = {
      next: () => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Statistik-Daten gespeichert!'});
      },
      error: error => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
      },
    };

    this.distributionApiService.saveStatisticData(this.employeeCount.value, this.personsInShelterCount.value).subscribe(observer);
  }

  get employeeCount() {
    return this.form.get('employeeCount');
  }

  get personsInShelterCount() {
    return this.form.get('personsInShelterCount');
  }

}
