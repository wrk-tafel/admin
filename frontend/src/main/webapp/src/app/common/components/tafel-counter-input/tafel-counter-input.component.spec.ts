import {TestBed} from '@angular/core/testing';
import {TafelCounterInputComponent} from './tafel-counter-input.component';

describe('TafelCounterInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TafelCounterInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('names the number field and both buttons after the label', () => {
    const fixture = TestBed.createComponent(TafelCounterInputComponent);
    fixture.componentRef.setInput('testId', 'category-1');
    fixture.componentRef.setInput('label', 'Warenmenge Backwaren');
    fixture.componentRef.setInput('key', 1);
    fixture.componentRef.setInput('value', 0);
    fixture.detectChanges();

    const element = fixture.nativeElement;
    expect(element.querySelector('input').getAttribute('aria-label')).toBe('Warenmenge Backwaren');
    expect(element.querySelector('[testid="category-1-decrement-button"]').getAttribute('aria-label'))
      .toBe('Warenmenge Backwaren verringern');
    expect(element.querySelector('[testid="category-1-increment-button"]').getAttribute('aria-label'))
      .toBe('Warenmenge Backwaren erhöhen');
  });

  it('a plain click/tap still only steps once', () => {
    const fixture = TestBed.createComponent(TafelCounterInputComponent);
    fixture.componentRef.setInput('testId', 'category-1');
    fixture.componentRef.setInput('label', 'Warenmenge Backwaren');
    fixture.componentRef.setInput('key', 1);
    fixture.componentRef.setInput('value', 0);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    // a quick tap: pointerdown immediately followed by pointerup, well before the hold delay
    component.startHoldIncrement();
    component.stopHold();
    component.onIncrementClick();

    expect(component.currentValue()).toBe(1);
  });

  it('holding past the delay repeats on its own and the trailing click does not add another step', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(TafelCounterInputComponent);
      fixture.componentRef.setInput('testId', 'category-1');
      fixture.componentRef.setInput('label', 'Warenmenge Backwaren');
      fixture.componentRef.setInput('key', 1);
      fixture.componentRef.setInput('value', 0);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.startHoldIncrement();

      vi.advanceTimersByTime(500); // HOLD_DELAY_MS: the hold has now started auto-repeating
      expect(component.currentValue()).toBe(1);

      vi.advanceTimersByTime(240); // two REPEAT_INTERVAL_MS (120ms) ticks
      expect(component.currentValue()).toBe(3);

      component.stopHold();
      // the browser's own click fires right after the matching pointerup - must not step again
      component.onIncrementClick();
      expect(component.currentValue()).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sliding off the button mid-hold does not swallow the next genuine tap', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(TafelCounterInputComponent);
      fixture.componentRef.setInput('testId', 'category-1');
      fixture.componentRef.setInput('label', 'Warenmenge Backwaren');
      fixture.componentRef.setInput('key', 1);
      fixture.componentRef.setInput('value', 0);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.startHoldIncrement();
      vi.advanceTimersByTime(500); // HOLD_DELAY_MS: the hold has now started auto-repeating
      expect(component.currentValue()).toBe(1);

      // the finger slides off the button before releasing - pointerleave stops the hold, but no
      // click ever follows to consume the suppression flag
      component.onHoldPointerLeave();

      // a later genuine tap, possibly on the other button, must still register
      component.onIncrementClick();
      expect(component.currentValue()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('decrement repeats the same way while held', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(TafelCounterInputComponent);
      fixture.componentRef.setInput('testId', 'category-1');
      fixture.componentRef.setInput('label', 'Warenmenge Backwaren');
      fixture.componentRef.setInput('key', 1);
      fixture.componentRef.setInput('value', 10);
      fixture.componentRef.setInput('minValue', 0);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.startHoldDecrement();
      vi.advanceTimersByTime(500 + 120);

      expect(component.currentValue()).toBe(8);
      component.stopHold();
    } finally {
      vi.useRealTimers();
    }
  });

  it('releasing before the hold delay never starts repeating', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(TafelCounterInputComponent);
      fixture.componentRef.setInput('testId', 'category-1');
      fixture.componentRef.setInput('label', 'Warenmenge Backwaren');
      fixture.componentRef.setInput('key', 1);
      fixture.componentRef.setInput('value', 0);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.startHoldIncrement();
      vi.advanceTimersByTime(200); // well under HOLD_DELAY_MS
      component.stopHold();

      vi.advanceTimersByTime(1000);
      expect(component.currentValue()).toBe(0);

      component.onIncrementClick();
      expect(component.currentValue()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

});
