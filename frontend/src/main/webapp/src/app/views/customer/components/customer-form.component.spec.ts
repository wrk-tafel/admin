import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import * as moment from 'moment';
import {of} from 'rxjs';
import {CountryApiService} from '../../../common/api/country-api.service';
import {CustomerData} from '../api/customer-api.service';
import {CustomerFormComponent} from './customer-form.component';
import {ReactiveFormsModule} from "@angular/forms";

describe('CustomerFormComponent', () => {
  let apiService: jasmine.SpyObj<CountryApiService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('CountryApiService', ['getCountries']);

    TestBed.configureTestingModule({
      declarations: [
        CustomerFormComponent
      ],
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
      ],
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
      {id: 0, code: 'AT', name: 'Österreich'},
      {id: 1, code: 'DE', name: 'Deutschland'}
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
      incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
      additionalPersons: [
        {
          key: 0,
          id: 0,
          lastname: 'Last 1',
          firstname: 'First 1',
          birthDate: moment().subtract(1, 'years').startOf('day').utc().toDate(),
          income: null
        },
        {
          key: 1,
          id: 1,
          lastname: 'Last 2',
          firstname: 'First 2',
          birthDate: moment().subtract(4, 'years').startOf('day').utc().toDate(),
          income: null
        }
      ]
    };

    spyOn(component.customerDataChange, 'emit');
    component.ngOnInit();

    component.customerData = testData;

    // TODO check dom elements - makes more sense
    /*
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      expect(fixture.debugElement.query(By.css('[testId="idInput"]')).nativeElement.value).toBe(testData.id);
    });
    */

    expect(component.id.value).toBe(testData.id);
    expect(component.lastname.value).toBe(testData.lastname);
    expect(component.firstname.value).toBe(testData.firstname);
    expect(component.birthDate.value).toBe(testData.birthDate);
    expect(component.country.value).toBe(testData.country);
    expect(component.telephoneNumber.value).toBe(testData.telephoneNumber);
    expect(component.email.value).toBe(testData.email);
    expect(component.street.value).toBe(testData.address.street);
    expect(component.houseNumber.value).toBe(testData.address.houseNumber);
    expect(component.door.value).toBe(testData.address.door);
    expect(component.stairway.value).toBe(testData.address.stairway);
    expect(component.postalCode.value).toBe(testData.address.postalCode);
    expect(component.city.value).toBe(testData.address.city);
    expect(component.employer.value).toBe(testData.employer);
    expect(component.income.value).toBe(testData.income);
    expect(component.incomeDue.value).toBe(testData.incomeDue);

    expect(component.isValid()).toBe(true);
    expect(component.countries).toEqual(mockCountryList);

    expect(component.lastname.value).toBe(testData.lastname);
    component.lastname.setValue('updated');
    fixture.detectChanges();
    expect(component.customerDataChange.emit).toHaveBeenCalled();
  }));

});
