import {TestBed} from '@angular/core/testing';
import {TafelInfoTooltipComponent} from './tafel-info-tooltip.component';
import {MatTooltip} from '@angular/material/tooltip';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

describe('TafelInfoTooltipComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TafelInfoTooltipComponent);
    fixture.componentRef.setInput('text', 'Erklärung');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the text as tooltip and aria-label', () => {
    const fixture = TestBed.createComponent(TafelInfoTooltipComponent);
    fixture.componentRef.setInput('text', 'Erklärung zum Feld');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const tooltip = fixture.debugElement.query(el => !!el.injector.get(MatTooltip, null))
      .injector.get(MatTooltip);

    expect(tooltip.message).toBe('Erklärung zum Feld');
    expect(button.getAttribute('aria-label')).toBe('Erklärung zum Feld');
  });

  it('should use a default testid which can be overridden', () => {
    const fixture = TestBed.createComponent(TafelInfoTooltipComponent);
    fixture.componentRef.setInput('text', 'Erklärung');
    fixture.detectChanges();

    let button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('testid')).toBe('info-tooltip');

    fixture.componentRef.setInput('testId', 'income-info-tooltip');
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('testid')).toBe('income-info-tooltip');
  });

  it('should not submit a surrounding form', () => {
    const fixture = TestBed.createComponent(TafelInfoTooltipComponent);
    fixture.componentRef.setInput('text', 'Erklärung');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('type')).toBe('button');
  });
});
