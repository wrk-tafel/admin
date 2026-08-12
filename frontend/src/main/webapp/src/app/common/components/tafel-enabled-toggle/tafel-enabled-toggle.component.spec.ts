import {TestBed} from '@angular/core/testing';
import {Component, signal} from '@angular/core';
import {TafelEnabledToggleComponent} from './tafel-enabled-toggle.component';

@Component({
  selector: 'tafel-enabled-toggle-test-host',
  imports: [TafelEnabledToggleComponent],
  template: `
    <tafel-enabled-toggle [enabled]="enabled()" label="Fahrzeug Bus 1" [showLabel]="showLabel()"
                          testId="cars-enabled-toggle-0" (enabledChange)="changed.set($event)"/>`
})
class TestHostComponent {
  enabled = signal(true);
  showLabel = signal(true);
  changed = signal<boolean | null>(null);
}

describe('TafelEnabledToggleComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({}).compileComponents();
  });

  it('shows the record as active and names it for a screen reader', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[testid="cars-enabled-toggle-0"]');
    expect(toggle.textContent.trim()).toBe('Aktiv');
    expect(toggle.querySelector('button').getAttribute('aria-label')).toBe('Aktiv - Fahrzeug Bus 1');
    expect(toggle.querySelector('button').getAttribute('aria-checked')).toBe('true');
  });

  it('drops the visible label where a column header already carries it', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.showLabel.set(false);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[testid="cars-enabled-toggle-0"]');
    expect(toggle.textContent.trim()).toBe('');
    // the record is still named, which is all a screen reader has here
    expect(toggle.querySelector('button').getAttribute('aria-label')).toBe('Aktiv - Fahrzeug Bus 1');
  });

  it('emits the new state when switched', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[testid="cars-enabled-toggle-0"] button').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.changed()).toBe(false);
  });

  it('shows a deactivated record as switched off', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[testid="cars-enabled-toggle-0"]');
    expect(toggle.querySelector('button').getAttribute('aria-checked')).toBe('false');
  });
});
