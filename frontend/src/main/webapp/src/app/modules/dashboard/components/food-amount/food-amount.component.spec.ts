import {TestBed} from '@angular/core/testing';
import {FoodAmountComponent} from './food-amount.component';
import {By} from '@angular/platform-browser';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('FoodAmountComponent', () => {

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('food amount rendered', () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('amount', 1234);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="food-amount-total"]')).nativeElement.textContent).toBe('1.234,00 kg');
  });

  it('food amount rendered without active distribution', () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="food-amount-total"]')).nativeElement.textContent).toBe('-');
  });

});
