import {TestBed} from '@angular/core/testing';
import {RegisteredPersonsComponent} from './registered-persons.component';
import {By} from '@angular/platform-browser';

describe('RegisteredPersonsComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({}).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RegisteredPersonsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('persons count rendered', () => {
    const fixture = TestBed.createComponent(RegisteredPersonsComponent);

    fixture.componentRef.setInput('count', 42);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="persons-count"]')).nativeElement.textContent).toBe('42');
  });

  it('renders a dash without a count', () => {
    const fixture = TestBed.createComponent(RegisteredPersonsComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="persons-count"]')).nativeElement.textContent).toBe('-');
  });

});
