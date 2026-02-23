import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import moment from 'moment';
import {of} from 'rxjs';
import {CountryApiService} from '../../../../api/country-api.service';
import {CustomerData, Gender} from '../../../../api/customer-api.service';
import {CustomerFormComponent} from './customer-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';

describe('CustomerFormComponent', () => {
  let apiService: MockedObject<CountryApiService>;

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
    validUntil: moment().add(1, 'years').add(2, 'months').startOf('day').utc().toDate(),
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
    const apiServiceSpy = {
      getCountries: vi.fn().mockName('CountryApiService.getCountries').mockReturnValue(of(mockCountryList))
    } as any;

    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent
      ],
      providers: [
        {
          provide: CountryApiService,
          useValue: apiServiceSpy
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CountryApiService) as MockedObject<CountryApiService>;
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('data filling works', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    vi.spyOn(component.customerDataChange, 'emit');
    fixture.componentRef.setInput('customerData', testCustomerData);
    fixture.detectChanges();

    // TODO check dom elements - makes more sense
    /*
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      expect(fixture.debugElement.query(By.css('[testid="idInput"]')).nativeElement.value).toBe(testData.id);
    });
    */

    expect(component.customerForm.lastname().value()).toBe(testCustomerData.lastname);
    expect(component.customerForm.firstname().value()).toBe(testCustomerData.firstname);
    expect(component.customerForm.birthDate().value()).toBe(testCustomerData.birthDate);
    expect(component.customerForm.gender().value()).toBe(testCustomerData.gender);
    expect(component.customerForm.country().value()).toBe(testCustomerData.country);
    expect(component.customerForm.telephoneNumber().value()).toBe(testCustomerData.telephoneNumber);
    expect(component.customerForm.email().value()).toBe(testCustomerData.email);
    expect(component.customerForm.address.street().value()).toBe(testCustomerData.address.street);
    expect(component.customerForm.address.houseNumber().value()).toBe(testCustomerData.address.houseNumber);
    expect(component.customerForm.address.door().value()).toBe(testCustomerData.address.door);
    expect(component.customerForm.address.stairway().value()).toBe(testCustomerData.address.stairway);
    expect(component.customerForm.address.postalCode().value()).toBe(testCustomerData.address.postalCode);
    expect(component.customerForm.address.city().value()).toBe(testCustomerData.address.city);
    expect(component.customerForm.employer().value()).toBe(testCustomerData.employer);
    expect(component.customerForm.income().value()).toBe(testCustomerData.income);
    expect(component.customerForm.incomeDue().value()).toBe(testCustomerData.incomeDue);
    expect(component.customerForm.validUntil().value()).toEqual(testCustomerData.validUntil);

    expect(component.customerForm().valid()).toBe(true);
    expect(component.countries()).toEqual(mockCountryList);

    expect(component.customerForm.additionalPersons().value().length).toBe(2);
    expect(component.customerForm.additionalPersons().value()[0])
      .toEqual(expect.objectContaining({
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
    expect(component.customerForm.additionalPersons().value()[1])
      .toEqual(expect.objectContaining({
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

  it('data update works', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    vi.spyOn(component.customerDataChange, 'emit');
    fixture.componentRef.setInput('customerData', testCustomerData);
    fixture.detectChanges();

    const updatedLastname = 'updated';
    const updatedBirthDate = moment().subtract(30, 'years').startOf('day').utc().toDate();
    const updatedGender = Gender.FEMALE;
    const updatedIncome = 54321;
    const updatedIncomeDue = moment().add(2, 'years').startOf('day').utc().toDate();

    component.customerForm.lastname().value.set(updatedLastname);
    component.customerForm.birthDate().value.set(updatedBirthDate);
    component.customerForm.gender().value.set(updatedGender);
    component.customerForm.income().value.set(updatedIncome);
    component.customerForm.incomeDue().value.set(updatedIncomeDue);

    // TODO const updatedPers1Lastname = 'Pers1UpdatedLastName';
    // TODO component.additionalPersons.at(1).get('lastname').setValue(updatedPers1Lastname);
    fixture.detectChanges();

    expect(component.customerDataChange.emit).toHaveBeenCalledWith(expect.objectContaining({
      lastname: updatedLastname,
      birthDate: updatedBirthDate,
      gender: updatedGender,
      income: updatedIncome
    }));

    // TODO validate add person change
    /*
    expect(component.customerDataChange.emit).toHaveBeenCalledWith(expect.objectContaining({
      additionalPersons: [
        {},
        {
          lastname: updatedPers1Lastname
        }]
    }));
     */
  });

  it('validUntil set when incomeDue is updated', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger effects

    // Set incomeDue as string (YYYY-MM-DD format as HTML date input provides)
    component.customerForm.incomeDue().value.set('2000-01-01' as any);
    fixture.detectChanges(); // Trigger effect after value change

    const validUntil = moment(component.customerForm.validUntil().value()).format('YYYY-MM-DD');
    expect(validUntil).toEqual('2000-03-01');
  });

  it('validUntil updates as incomeDue changes if not manually changed', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // First set incomeDue
    component.customerForm.incomeDue().value.set(moment('2000-01-01', 'YYYY-MM-DD').toDate());
    fixture.detectChanges();
    const validUntil = moment(component.customerForm.validUntil().value()).format('YYYY-MM-DD');
    expect(validUntil).toEqual('2000-03-01');

    // Change incomeDue - validUntil should update
    component.customerForm.incomeDue().value.set(moment('2000-02-01', 'YYYY-MM-DD').toDate());
    fixture.detectChanges();

    const validUntilUpdated = moment(component.customerForm.validUntil().value()).format('YYYY-MM-DD');
    expect(validUntilUpdated).toEqual('2000-04-01');
  });

});
