import {Component, effect, input, output, signal} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ButtonDirective, ColComponent, FormControlDirective, FormModule, RowComponent} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'tafel-counter-input',
    templateUrl: 'tafel-counter-input.component.html',
    imports: [
        FormModule,
        ReactiveFormsModule,
        FormControlDirective,
        RowComponent,
        ColComponent,
        ButtonDirective,
        FaIconComponent,
        FormsModule
    ]
})
export class TafelCounterInputComponent {
  testId = input.required<string>();
  key = input.required<unknown>();
  value = input.required<number>();
  minValue = input<number>(0);
  maxValue = input<number>(99);
  valueChanged = output<TafelCounterInputValueChange>();

  currentValue = signal<number>(0);

  loadEffect = effect(() => {
    this.currentValue.set(this.value());
  });

  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;

  onValueChange(count: number) {
    if (count < this.minValue()) {
      count = this.minValue();
    } else if (count > this.maxValue()) {
      count = this.maxValue();
    }
    this.currentValue.set(count);

    const valueChange: TafelCounterInputValueChange = {key: this.key(), value: this.currentValue()};
    this.valueChanged.emit(valueChange);
  }

  increment() {
    this.onValueChange(this.currentValue() + 1);
  }

  decrement() {
    this.onValueChange(this.currentValue() - 1);
  }

}

export interface TafelCounterInputValueChange {
  key: unknown;
  value: number;
}
