import {Component, input, linkedSignal, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'tafel-counter-input',
    templateUrl: 'tafel-counter-input.component.html',
    imports: [
        MatButtonModule,
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

  // Writable signal that resets to input value when it changes, but can be locally modified
  currentValue = linkedSignal(() => this.value());

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
