import {TestBed} from '@angular/core/testing';
import {LastDistributionSummaryComponent} from './last-distribution-summary.component';
import {By} from '@angular/platform-browser';
import {DashboardLastDistributionData} from '../../dashboard.component';

describe('LastDistributionSummaryComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({}).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(LastDistributionSummaryComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the summary of the last closed distribution', () => {
    const summary: DashboardLastDistributionData = {
      date: new Date(2026, 0, 15),
      registeredCustomers: 42,
      registeredPersons: 84,
      countProcessedTickets: 40,
      foodAmountTotal: 123.456,
      sheltersCount: 2,
      personsInSheltersCount: 15,
    };

    const fixture = TestBed.createComponent(LastDistributionSummaryComponent);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="last-distribution-customers"]')).nativeElement.textContent).toBe('42');
    expect(fixture.debugElement.query(By.css('[testid="last-distribution-persons"]')).nativeElement.textContent).toBe('84');
    expect(fixture.debugElement.query(By.css('[testid="last-distribution-tickets"]')).nativeElement.textContent).toBe('40');
    const foodAmountText = fixture.debugElement.query(By.css('[testid="last-distribution-food-amount"]')).nativeElement.textContent;
    expect(foodAmountText.trim()).toBe('123,46 kg');
    expect(fixture.debugElement.query(By.css('[testid="last-distribution-shelters"]')).nativeElement.textContent).toBe('2');
    expect(fixture.debugElement.query(By.css('[testid="last-distribution-shelter-persons"]')).nativeElement.textContent).toBe('15');
  });

  it('renders a placeholder when no distribution has ever been closed', () => {
    const fixture = TestBed.createComponent(LastDistributionSummaryComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="last-distribution-empty"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="last-distribution-customers"]'))).toBeFalsy();
  });

});
