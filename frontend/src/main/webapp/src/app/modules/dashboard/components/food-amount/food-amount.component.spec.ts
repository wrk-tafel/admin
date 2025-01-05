import {TestBed, waitForAsync} from '@angular/core/testing';
import {FoodAmountComponent} from './food-amount.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID} from '@angular/core';

describe('FoodAmountComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LOCALE_ID,
          useValue: 'de-AT'
        },
        {
          provide: DEFAULT_CURRENCY_CODE,
          useValue: 'EUR'
        },
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
    expect(fixture.debugElement.query(By.css('[testid="food-amount-total"]')).nativeElement.textContent).toBe(`1 234,00 kg`);
  });

  it('food amount rendered without active distribution', () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="food-amount-total"]')).nativeElement.textContent).toBe(`-`);
  });

});
