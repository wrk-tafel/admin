import { TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import * as moment from 'moment';
import { of } from 'rxjs';
import { CountryApiService } from '../../../common/api/country-api.service';
import { CustomerData } from '../api/customer-api.service';
import { CustomerFormComponent } from './customer-form.component';

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
      { id: 0, code: 'AT', name: 'Österreich' },
      { id: 1, code: 'DE', name: 'Deutschland' }
    ];
    apiService.getCountries.and.returnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    const testData: CustomerData = {
      id: 123,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(20, 'years').startOf('day').utc().toDate(),
      country: mockCountryList[0],
      telephoneNumber: 660123123,
      email: 'test@mail.com',
      address: {
        street: 'Testgasse',
        houseNumber: '123A',
        door: '1',
        stairway: '1',
        postalCode: 1234,
        city: 'Wien',
      },
      employer: 'WRK',
      income: 123.50,
      incomeDue: moment().add(1, 'years').startOf('day').utc().toDate()
    };

    component.form.patchValue(testData);
    spyOn(component.dataUpdatedEvent, 'emit');
    component.ngOnInit();

    // TODO check dom elements - makes more sense
    /*
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      expect(fixture.debugElement.query(By.css('[testId="idInput"]')).nativeElement.value).toBe(testData.id);
    });
    */

    expect(component.form.get('id').value).toBe(testData.id);
    expect(component.form.get('lastname').value).toBe(testData.lastname);
    expect(component.form.get('firstname').value).toBe(testData.firstname);
    expect(component.form.get('birthDate').value).toBe(testData.birthDate);
    expect(component.form.get('country').get('name').value).toBe(testData.country.name);
    expect(component.form.get('telephoneNumber').value).toBe(testData.telephoneNumber);
    expect(component.form.get('email').value).toBe(testData.email);
    expect(component.form.get('address').get('street').value).toBe(testData.address.street);
    expect(component.form.get('address').get('houseNumber').value).toBe(testData.address.houseNumber);
    expect(component.form.get('address').get('door').value).toBe(testData.address.door);
    expect(component.form.get('address').get('stairway').value).toBe(testData.address.stairway);
    expect(component.form.get('address').get('postalCode').value).toBe(testData.address.postalCode);
    expect(component.form.get('address').get('city').value).toBe(testData.address.city);
    expect(component.form.get('employer').value).toBe(testData.employer);
    expect(component.form.get('income').value).toBe(testData.income);
    expect(component.form.get('incomeDue').value).toBe(testData.incomeDue);

    expect(component.form.valid).toBe(true);
    expect(component.countries).toEqual(mockCountryList);

    expect(component.lastname.value).toBe(testData.lastname);
    component.lastname.setValue('updated');
    fixture.detectChanges();
    expect(component.dataUpdatedEvent.emit).toHaveBeenCalled();
  }));

});
