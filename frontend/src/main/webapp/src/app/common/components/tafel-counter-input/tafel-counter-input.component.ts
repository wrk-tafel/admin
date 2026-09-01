import {Component, DestroyRef, inject, input, linkedSignal, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../util/svg-icon.util';
import removeIcon from '@material-symbols/svg-400/outlined/remove-fill.svg';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';

// Long enough that a normal tap never triggers the repeat, short enough that holding down for a
// larger amount doesn't feel like waiting.
const HOLD_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 120;

@Component({
    selector: 'tafel-counter-input',
    templateUrl: 'tafel-counter-input.component.html',
    imports: [
        MatButtonModule,
        MatIcon,
        FormsModule
    ]
})
export class TafelCounterInputComponent {
  private readonly registerIcons = registerSvgIcons({add: addIcon, remove: removeIcon});

  testId = input.required<string>();
  /** Names the counter for assistive technology, e.g. the food category it counts. */
  label = input.required<string>();
  key = input.required<unknown>();
  value = input.required<number>();
  minValue = input<number>(0);
  maxValue = input<number>(99);
  valueChanged = output<TafelCounterInputValueChange>();

  // Writable signal that resets to input value when it changes, but can be locally modified
  currentValue = linkedSignal(() => this.value());

  private readonly destroyRef = inject(DestroyRef);
  private holdTimeoutId?: ReturnType<typeof setTimeout>;
  private repeatIntervalId?: ReturnType<typeof setInterval>;
  // Set once holding has actually started repeating, so the `click` that follows the eventual
  // pointerup (a tap and a release-after-hold look identical to the browser) doesn't apply once more
  // on top of what the repeat already applied.
  private suppressNextClick = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopHold());
  }

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

  onIncrementClick() {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    this.increment();
  }

  onDecrementClick() {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    this.decrement();
  }

  /**
   * Starts a press-and-hold repeat for larger amounts - built for gloved/one-handed use where
   * tapping a counter dozens of times isn't practical. `step` only starts firing on its own once
   * held past {@link HOLD_DELAY_MS}, so a normal tap is untouched and still goes through the
   * `click` handlers above.
   */
  startHoldIncrement() {
    this.startHold(() => this.increment());
  }

  startHoldDecrement() {
    this.startHold(() => this.decrement());
  }

  private startHold(step: () => void) {
    this.stopHold();
    this.holdTimeoutId = setTimeout(() => {
      this.suppressNextClick = true;
      step();
      this.repeatIntervalId = setInterval(step, REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }

  stopHold() {
    clearTimeout(this.holdTimeoutId);
    clearInterval(this.repeatIntervalId);
    this.holdTimeoutId = undefined;
    this.repeatIntervalId = undefined;
  }

  /**
   * Called on `pointerleave` instead of plain `stopHold()`: sliding off the button mid-hold stops
   * the repeat without a `click` ever following to consume {@link suppressNextClick} - unlike a
   * `pointerup` in place, which `click` follows right after and consumes it itself. Left set, the
   * next genuine tap on either button would be silently swallowed (see #3605).
   */
  onHoldPointerLeave() {
    this.stopHold();
    this.suppressNextClick = false;
  }

}

export interface TafelCounterInputValueChange {
  key: unknown;
  value: number;
}
