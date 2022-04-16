import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { CountryApiService } from '../../../common/api/country-api.service';
import { CustomerFormComponent, CustomerFormData } from './customer-form.component';

describe('CustomerFormComponent', () => {
  let apiService: jasmine.SpyObj<CountryApiService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('CountryApiService', ['getCountries']);

    TestBed.configureTestingModule({
      declarations: [
        CustomerFormComponent
      ],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: CountryApiService,
          useValue: apiServiceSpy
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CountryApiService) as jasmine.SpyObj<CountryApiService>;
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('data filling and update is working', waitForAsync(() => {
    const mockCountryList = [
      { code: 'AT', name: 'Österreich' },
      { code: 'DE', name: 'Deutschland' }
    ];
    apiService.getCountries.and.returnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    const testData: CustomerFormData = {
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: new Date(2022, 3, 27),
      country: 'AT',
      telephoneNumber: 660123123,
      email: 'test@mail.com',
      street: 'Testgasse',
      houseNumber: '123A',
      door: '1',
      stairway: '1',
      postalCode: 1234,
      city: 'Wien',
      employer: 'WRK',
      income: 123.50,
      incomeDue: new Date(2022, 3, 27)
    }
    component.customerData = testData;
    spyOn(component.dataUpdatedEvent, 'emit');
    component.ngOnInit();

    expect(component.customerForm.get('customerId').value).toBe('');
    expect(component.customerForm.get('lastname').value).toBe(testData.lastname);
    expect(component.customerForm.get('firstname').value).toBe(testData.firstname);
    expect(component.customerForm.get('birthDate').value).toBe('2022-04-26');
    expect(component.customerForm.get('country').value).toBe(testData.country);
    expect(component.customerForm.get('telephoneNumber').value).toBe(testData.telephoneNumber);
    expect(component.customerForm.get('email').value).toBe(testData.email);
    expect(component.customerForm.get('street').value).toBe(testData.street);
    expect(component.customerForm.get('houseNumber').value).toBe(testData.houseNumber);
    expect(component.customerForm.get('door').value).toBe(testData.door);
    expect(component.customerForm.get('stairway').value).toBe(testData.stairway);
    expect(component.customerForm.get('postalCode').value).toBe(testData.postalCode);
    expect(component.customerForm.get('city').value).toBe(testData.city);
    expect(component.customerForm.get('employer').value).toBe(testData.employer);
    expect(component.customerForm.get('income').value).toBe(testData.income);
    expect(component.customerForm.get('incomeDue').value).toBe('2022-04-26');

    expect(component.customerForm.valid).toBe(true);
    expect(component.countries).toEqual(mockCountryList);

    expect(component.lastname.value).toBe(testData.lastname);
    component.lastname.setValue('updated');
    fixture.detectChanges();
    expect(component.dataUpdatedEvent.emit).toHaveBeenCalled();
  }));

});
