import {TestBed} from '@angular/core/testing';
import {StatTileComponent} from './stat-tile.component';
import {By} from '@angular/platform-browser';

describe('StatTileComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({}).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatTileComponent);
    fixture.componentRef.setInput('testId', 'some-tile');
    fixture.componentRef.setInput('label', 'Some Label');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the label and value', () => {
    const fixture = TestBed.createComponent(StatTileComponent);
    fixture.componentRef.setInput('testId', 'active-households-count');
    fixture.componentRef.setInput('label', 'Kunden gesamt');
    fixture.componentRef.setInput('value', 137);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('h2')).nativeElement.textContent).toBe('Kunden gesamt');
    expect(fixture.debugElement.query(By.css('[testid="active-households-count"]')).nativeElement.textContent).toBe('137');
  });

  it('renders a dash without a value', () => {
    const fixture = TestBed.createComponent(StatTileComponent);
    fixture.componentRef.setInput('testId', 'active-households-count');
    fixture.componentRef.setInput('label', 'Kunden gesamt');

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="active-households-count"]')).nativeElement.textContent).toBe('-');
  });

});
