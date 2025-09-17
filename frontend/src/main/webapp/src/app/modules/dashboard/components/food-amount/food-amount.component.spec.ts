import {TestBed} from '@angular/core/testing';
import {FoodAmountComponent} from './food-amount.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZonelessChangeDetection} from '@angular/core';

describe('FoodAmountComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      providers: [
        provideZonelessChangeDetection(),
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
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('food amount rendered', async () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('amount', 1234);

    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('[testid="food-amount-total"]')).nativeElement.textContent).toBe(`1 234,00 kg`);
  });

  it('food amount rendered without active distribution', async () => {
    const fixture = TestBed.createComponent(FoodAmountComponent);

    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('[testid="food-amount-total"]')).nativeElement.textContent).toBe(`-`);
  });

});
