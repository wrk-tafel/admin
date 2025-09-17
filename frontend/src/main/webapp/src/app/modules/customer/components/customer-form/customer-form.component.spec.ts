import {TestBed} from '@angular/core/testing';
import moment from 'moment';
import {of} from 'rxjs';
import {CountryApiService} from '../../../../api/country-api.service';
import {CustomerData, Gender} from '../../../../api/customer-api.service';
import {CustomerFormComponent} from './customer-form.component';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {provideZonelessChangeDetection} from "@angular/core";

describe('CustomerFormComponent', () => {
  let apiService: jasmine.SpyObj<CountryApiService>;

  const mockCountryList = [
    {id: 0, code: 'AT', name: 'Österreich'},
    {id: 1, code: 'DE', name: 'Deutschland'}
  ];

  const testCustomerData: CustomerData = {
    id: 123,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(20, 'years').startOf('day').utc().toDate(),
    gender: Gender.MALE,
    country: mockCountryList[0],
    telephoneNumber: '0043660123123',
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
    validUntil: moment().add(1, 'years').startOf('day').utc().toDate(),
    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Last 1',
        firstname: 'First 1',
        birthDate: moment().subtract(1, 'years').startOf('day').utc().toDate(),
        gender: Gender.FEMALE,
        country: mockCountryList[0],
        employer: 'test employer 2',
        income: 200,
        incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
        excludeFromHousehold: false,
        receivesFamilyBonus: true
      },
      {
        key: 1,
        id: 1,
        lastname: 'Last 2',
        firstname: 'First 2',
        birthDate: moment().subtract(4, 'years').startOf('day').utc().toDate(),
        gender: Gender.MALE,
        country: mockCountryList[0],
        excludeFromHousehold: true,
        receivesFamilyBonus: false
      }
    ]
  };

  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('CountryApiService', ['getCountries']);

    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent
      ],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: CountryApiService,
          useValue: apiServiceSpy
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CountryApiService) as jasmine.SpyObj<CountryApiService>;
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('data filling works', () => {
    apiService.getCountries.and.returnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.customerDataChange, 'emit');
    component.ngOnInit();
    component.customerData = testCustomerData;

    // TODO check dom elements - makes more sense
    /*
    await fixture.whenStable();

    fixture.whenStable().then(() => {
      expect(fixture.debugElement.query(By.css('[testid="idInput"]')).nativeElement.value).toBe(testData.id);
    });
    */

    expect(component.lastname.value).toBe(testCustomerData.lastname);
    expect(component.firstname.value).toBe(testCustomerData.firstname);
    expect(component.birthDate.value).toBe(testCustomerData.birthDate);
    expect(component.gender.value).toBe(testCustomerData.gender);
    expect(component.country.value).toBe(testCustomerData.country);
    expect(component.telephoneNumber.value).toBe(testCustomerData.telephoneNumber);
    expect(component.email.value).toBe(testCustomerData.email);
    expect(component.street.value).toBe(testCustomerData.address.street);
    expect(component.houseNumber.value).toBe(testCustomerData.address.houseNumber);
    expect(component.door.value).toBe(testCustomerData.address.door);
    expect(component.stairway.value).toBe(testCustomerData.address.stairway);
    expect(component.postalCode.value).toBe(testCustomerData.address.postalCode);
    expect(component.city.value).toBe(testCustomerData.address.city);
    expect(component.employer.value).toBe(testCustomerData.employer);
    expect(component.income.value).toBe(testCustomerData.income);
    expect(component.incomeDue.value).toBe(testCustomerData.incomeDue);
    expect(component.validUntil.value).toBe(testCustomerData.validUntil);

    expect(component.isValid()).toBeTrue();
    expect(component.countries).toEqual(mockCountryList);

    expect(component.additionalPersons.length).toBe(2);
    expect(component.additionalPersons.at(0).value)
      .toEqual(jasmine.objectContaining({
        id: testCustomerData.additionalPersons[0].id,
        lastname: testCustomerData.additionalPersons[0].lastname,
        firstname: testCustomerData.additionalPersons[0].firstname,
        birthDate: testCustomerData.additionalPersons[0].birthDate,
        gender: testCustomerData.additionalPersons[0].gender,
        country: testCustomerData.additionalPersons[0].country,
        employer: testCustomerData.additionalPersons[0].employer,
        income: testCustomerData.additionalPersons[0].income,
        incomeDue: testCustomerData.additionalPersons[0].incomeDue,
        receivesFamilyBonus: testCustomerData.additionalPersons[0].receivesFamilyBonus
      }));
    expect(component.additionalPersons.at(1).value)
      .toEqual(jasmine.objectContaining({
        id: testCustomerData.additionalPersons[1].id,
        lastname: testCustomerData.additionalPersons[1].lastname,
        firstname: testCustomerData.additionalPersons[1].firstname,
        birthDate: testCustomerData.additionalPersons[1].birthDate,
        gender: testCustomerData.additionalPersons[1].gender,
        country: testCustomerData.additionalPersons[1].country,
        excludeFromHousehold: testCustomerData.additionalPersons[1].excludeFromHousehold,
        receivesFamilyBonus: testCustomerData.additionalPersons[1].receivesFamilyBonus
      }));
  });

  it('data update works', async () => {
    apiService.getCountries.and.returnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.customerDataChange, 'emit');
    component.ngOnInit();
    component.customerData = testCustomerData;

    const updatedLastname = 'updated';
    const updatedBirthDate = moment().subtract(30, 'years').startOf('day').utc().toDate();
    const updatedGender = Gender.FEMALE;
    const updatedIncome = 54321;
    const updatedIncomeDue = moment().add(2, 'years').startOf('day').utc().toDate();

    component.lastname.setValue(updatedLastname);
    component.birthDate.setValue(updatedBirthDate);
    component.gender.setValue(updatedGender);
    component.income.setValue(updatedIncome);
    component.incomeDue.setValue(updatedIncomeDue);

    // TODO const updatedPers1Lastname = 'Pers1UpdatedLastName';
    // TODO component.additionalPersons.at(1).get('lastname').setValue(updatedPers1Lastname);
    await fixture.whenStable();

    expect(component.customerDataChange.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      lastname: updatedLastname,
      birthDate: updatedBirthDate,
      gender: updatedGender,
      income: updatedIncome
    }));

    // TODO validate add person change
    /*
    expect(component.customerDataChange.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      additionalPersons: [
        {},
        {
          lastname: updatedPers1Lastname
        }]
    }));
     */
  });

  it('trackBy', () => {
    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    const testUuid = 'test-UUID';

    const trackingId = component.trackBy(0, new FormGroup({
      key: new FormControl(testUuid)
    }));

    expect(trackingId).toBe(testUuid);
  });

  it('validUntil set when incomeDue is updated', async () => {
    apiService.getCountries.and.returnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    component.incomeDue.setValue(moment('01.01.2000', 'DD.MM.YYYY').toDate());

    await fixture.whenStable();

    expect(component.validUntil.value).toEqual(moment('01.03.2000', 'DD.MM.YYYY').toDate());
  });

  it('validUntil set when incomeDue is updated respects additional persons', async () => {
    apiService.getCountries.and.returnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    component.incomeDue.setValue(moment('03.03.2000', 'DD.MM.YYYY').toDate());
    component.addNewPerson();
    component.addNewPerson();
    component.additionalPersons.at(0).get('incomeDue').setValue('2000-02-02');
    component.additionalPersons.at(1).get('incomeDue').setValue('2000-01-01');

    component.removePerson(1);

    await fixture.whenStable();

    expect(component.validUntil.value).toEqual(moment('02.04.2000', 'DD.MM.YYYY').toDate());
  });

});
