import {TestBed} from '@angular/core/testing';
import {Component, signal} from '@angular/core';
import {TafelEnabledFilterComponent} from './tafel-enabled-filter.component';
import {EnabledFilter, matchesEnabledFilter} from './enabled-filter';

@Component({
  selector: 'tafel-enabled-filter-test-host',
  imports: [TafelEnabledFilterComponent],
  template: `
    <tafel-enabled-filter [value]="value()" testIdPrefix="shops" (valueChange)="value.set($event)"/>`
})
class TestHostComponent {
  value = signal<EnabledFilter>('ALL');
}

describe('TafelEnabledFilterComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({}).compileComponents();
  });

  it('renders the three choices under the test hooks of the list it filters', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement;
    expect(element.querySelector('[testid="shops-status-filter"]')).not.toBeNull();
    expect(element.querySelector('[testid="shops-filter-all"]').textContent.trim()).toBe('Alle');
    expect(element.querySelector('[testid="shops-filter-enabled"]').textContent.trim()).toBe('Aktiv');
    expect(element.querySelector('[testid="shops-filter-disabled"]').textContent.trim()).toBe('Inaktiv');
  });

  it('emits the chosen filter', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[testid="shops-filter-disabled"] button').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('DISABLED');
  });
});

describe('matchesEnabledFilter', () => {
  it('lets through what the chosen filter asks for', () => {
    expect(matchesEnabledFilter(true, 'ALL')).toBe(true);
    expect(matchesEnabledFilter(false, 'ALL')).toBe(true);
    expect(matchesEnabledFilter(true, 'ENABLED')).toBe(true);
    expect(matchesEnabledFilter(false, 'ENABLED')).toBe(false);
    expect(matchesEnabledFilter(true, 'DISABLED')).toBe(false);
    expect(matchesEnabledFilter(false, 'DISABLED')).toBe(true);
  });
});
