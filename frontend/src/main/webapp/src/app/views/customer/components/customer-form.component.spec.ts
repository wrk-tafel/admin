import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of } from 'rxjs';
import { CustomerApiService } from '../api/customer-api.service';
import { CustomerFormComponent, CustomerFormData } from './customer-form.component';

describe('CustomerFormComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCountries']);

    TestBed.configureTestingModule({
      declarations: [
        CustomerFormComponent
      ],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: apiServiceSpy
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
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
      birthDate: new Date(),
      nationality: 'Österreich',
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
      incomeDue: new Date()
    }
    component.customerData = testData;
    spyOn(component.dataUpdateEvent, 'emit');
    component.ngOnInit();

    expect(component.customerForm.value).toEqual(testData);
    expect(component.customerForm.valid).toBe(true);
    expect(component.countries).toEqual(mockCountryList);

    expect(component.lastname.value).toBe(testData.lastname);
    component.lastname.setValue('updated');
    fixture.detectChanges();
    expect(component.dataUpdateEvent.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      lastname: 'updated'
    }));
  }));

  it('prefilled postalCode and city', waitForAsync(() => {
    const component = new CustomerFormComponent(apiService);

    expect(component.postalCode.value).toBe(1030);
    expect(component.city.value).toBe('Wien');
    expect(component.customerForm.valid).toBe(false);
  }));

});
