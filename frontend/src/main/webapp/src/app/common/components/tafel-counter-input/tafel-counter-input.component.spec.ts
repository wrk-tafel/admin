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

});
