import {TestBed} from '@angular/core/testing';
import {TafelReorderHandleComponent} from './tafel-reorder-handle.component';

describe('TafelReorderHandleComponent', () => {

  function createHandle(position: number, count: number) {
    const fixture = TestBed.createComponent(TafelReorderHandleComponent);
    fixture.componentRef.setInput('label', 'Fahrzeug Bus 1');
    fixture.componentRef.setInput('position', position);
    fixture.componentRef.setInput('count', count);
    fixture.componentRef.setInput('testId', 'dragCarHandle-1');
    fixture.detectChanges();

    const moved: number[] = [];
    fixture.componentInstance.move.subscribe(offset => moved.push(offset));

    return {fixture, moved, button: fixture.nativeElement.querySelector('button') as HTMLButtonElement};
  }

  beforeEach(() => {
    TestBed.configureTestingModule({imports: []}).compileComponents();
  });

  it('is a focusable button that names the record and its position', () => {
    const {button} = createHandle(2, 7);

    expect(button.tabIndex).toBe(0);
    expect(button.getAttribute('aria-label'))
      .toBe('Fahrzeug Bus 1, Position 2 von 7, mit den Pfeiltasten verschieben');
  });

  it('emits an offset for the arrow keys and swallows the key so the page does not scroll', () => {
    const {moved, button} = createHandle(2, 7);

    const up = new KeyboardEvent('keydown', {key: 'ArrowUp', cancelable: true});
    button.dispatchEvent(up);
    const down = new KeyboardEvent('keydown', {key: 'ArrowDown', cancelable: true});
    button.dispatchEvent(down);

    expect(moved).toEqual([-1, 1]);
    expect(up.defaultPrevented).toBe(true);
    expect(down.defaultPrevented).toBe(true);
  });

  it('emits nothing past either end of the list', () => {
    const first = createHandle(1, 7);
    first.button.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', cancelable: true}));

    const last = createHandle(7, 7);
    last.button.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', cancelable: true}));

    expect(first.moved).toEqual([]);
    expect(last.moved).toEqual([]);
  });

  it('leaves every other key alone', () => {
    const {moved, button} = createHandle(2, 7);

    const enter = new KeyboardEvent('keydown', {key: 'Enter', cancelable: true});
    button.dispatchEvent(enter);

    expect(moved).toEqual([]);
    expect(enter.defaultPrevented).toBe(false);
  });

});
