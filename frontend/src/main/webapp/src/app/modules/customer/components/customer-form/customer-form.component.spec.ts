import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {of} from 'rxjs';

dayjs.extend(customParseFormat);
import {CountryApiService} from '../../../../api/country-api.service';
import {CustomerData, Gender} from '../../../../api/customer-api.service';
import {CustomerFormComponent} from './customer-form.component';
import {ReactiveFormsModule} from '@angular/forms';

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
    birthDate: dayjs().subtract(20, 'years').startOf('day').toDate(),
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
    incomeDue: dayjs().add(1, 'years').startOf('day').toDate(),
    validUntil: dayjs().add(1, 'years').add(2, 'months').startOf('day').toDate(),
    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Last 1',
        firstname: 'First 1',
        birthDate: dayjs().subtract(1, 'years').startOf('day').toDate(),
        gender: Gender.FEMALE,
        country: mockCountryList[0],
        employer: 'test employer 2',
        income: 200,
        incomeDue: dayjs().add(1, 'years').startOf('day').toDate(),
        excludeFromHousehold: false,
        receivesFamilyAllowance: true
      },
      {
        key: 1,
        id: 1,
        lastname: 'Last 2',
        firstname: 'First 2',
        birthDate: dayjs().subtract(4, 'years').startOf('day').toDate(),
        gender: Gender.MALE,
        country: mockCountryList[0],
        excludeFromHousehold: true,
        receivesFamilyAllowance: false
      }
    ]
  };

  beforeEach(() => {
    const apiServiceSpy = {
      getCountries: vi.fn().mockName('CountryApiService.getCountries').mockReturnValue(of(mockCountryList))
    } as any;

    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule
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
        id: testCustomerData.additionalPersons![0].id,
        lastname: testCustomerData.additionalPersons![0].lastname,
        firstname: testCustomerData.additionalPersons![0].firstname,
        birthDate: testCustomerData.additionalPersons![0].birthDate,
        gender: testCustomerData.additionalPersons![0].gender,
        country: testCustomerData.additionalPersons![0].country,
        employer: testCustomerData.additionalPersons![0].employer,
        income: testCustomerData.additionalPersons![0].income,
        incomeDue: testCustomerData.additionalPersons![0].incomeDue,
        receivesFamilyAllowance: testCustomerData.additionalPersons![0].receivesFamilyAllowance
      }));
    expect(component.customerForm.additionalPersons().value()[1])
      .toEqual(expect.objectContaining({
        id: testCustomerData.additionalPersons![1].id,
        lastname: testCustomerData.additionalPersons![1].lastname,
        firstname: testCustomerData.additionalPersons![1].firstname,
        birthDate: testCustomerData.additionalPersons![1].birthDate,
        gender: testCustomerData.additionalPersons![1].gender,
        country: testCustomerData.additionalPersons![1].country,
        excludeFromHousehold: testCustomerData.additionalPersons![1].excludeFromHousehold,
        receivesFamilyAllowance: testCustomerData.additionalPersons![1].receivesFamilyAllowance
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
    const updatedBirthDate = dayjs().subtract(30, 'years').startOf('day').toDate();
    const updatedGender = Gender.FEMALE;
    const updatedIncome = 54321;
    const updatedIncomeDue = dayjs().add(2, 'years').startOf('day').toDate();

    component.customerForm.lastname().value.set(updatedLastname);
    component.customerForm.birthDate().value.set(updatedBirthDate);
    component.customerForm.gender().value.set(updatedGender);
    component.customerForm.income().value.set(updatedIncome);
    component.customerForm.incomeDue().value.set(updatedIncomeDue);

    const updatedPers1Lastname = 'Pers1UpdatedLastName';
    component.personField(1).lastname().value.set(updatedPers1Lastname);
    fixture.detectChanges();

    expect(component.customerDataChange.emit).toHaveBeenCalledWith(expect.objectContaining({
      lastname: updatedLastname,
      birthDate: updatedBirthDate,
      gender: updatedGender,
      income: updatedIncome
    }));

    expect(component.customerDataChange.emit).toHaveBeenCalledWith(expect.objectContaining({
      additionalPersons: [
        expect.objectContaining({lastname: testCustomerData.additionalPersons![0].lastname}),
        expect.objectContaining({lastname: updatedPers1Lastname})
      ]
    }));
  });

  it('validUntil set when incomeDue is updated by the operator', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger effects

    // markAsDirty simulates a real edit through the bound date input (which marks the field dirty
    // before syncing its value) - a plain value.set() alone, as population does, must not trigger this.
    component.customerForm.incomeDue().markAsDirty();
    // Set incomeDue as string (YYYY-MM-DD format as HTML date input provides)
    component.customerForm.incomeDue().value.set('2000-01-01' as any);
    fixture.detectChanges(); // Trigger effect after value change

    const validUntil = dayjs(component.customerForm.validUntil().value()).format('YYYY-MM-DD');
    expect(validUntil).toEqual('2000-03-01');
  });

  it('validUntil updates as incomeDue changes if not manually changed', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.customerForm.incomeDue().markAsDirty();

    // First set incomeDue
    component.customerForm.incomeDue().value.set(dayjs('2000-01-01', 'YYYY-MM-DD').toDate());
    fixture.detectChanges();
    const validUntil = dayjs(component.customerForm.validUntil().value()).format('YYYY-MM-DD');
    expect(validUntil).toEqual('2000-03-01');

    // Change incomeDue - validUntil should update
    component.customerForm.incomeDue().value.set(dayjs('2000-02-01', 'YYYY-MM-DD').toDate());
    fixture.detectChanges();

    const validUntilUpdated = dayjs(component.customerForm.validUntil().value()).format('YYYY-MM-DD');
    expect(validUntilUpdated).toEqual('2000-04-01');
  });

  it('opening the edit form does not rewrite the stored validUntil from incomeDue', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;

    // incomeDue + 2 months deliberately differs from validUntil, so a wrongly-firing auto-fill
    // effect on population (see issue #3528) would be caught here.
    const populatedData: CustomerData = {
      ...testCustomerData,
      incomeDue: dayjs().add(30, 'days').toDate(),
      validUntil: dayjs().add(1, 'years').toDate()
    };

    fixture.componentRef.setInput('customerData', populatedData);
    fixture.detectChanges();

    expect(component.customerForm.validUntil().value()).toEqual(populatedData.validUntil);
  });

  it('prefills the persons handed over from the quick-check screen', () => {
    apiService.getCountries.mockReturnValue(of(mockCountryList));

    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mainBirthDate = dayjs().subtract(30, 'years').startOf('day').toDate();
    const childBirthDate = dayjs().subtract(5, 'years').startOf('day').toDate();

    component.prefillQuickCheckPersons([
      {birthDate: mainBirthDate, income: 1000, receivesFamilyAllowance: false},
      {birthDate: childBirthDate, income: undefined, receivesFamilyAllowance: true}
    ]);

    expect(component.customerForm.birthDate().value()).toEqual(mainBirthDate);
    expect(component.customerForm.income().value()).toEqual(1000);

    const additionalPersons = component.customerForm.additionalPersons().value();
    expect(additionalPersons).toHaveLength(1);
    expect(additionalPersons[0]).toEqual(expect.objectContaining({
      birthDate: childBirthDate,
      income: null,
      receivesFamilyAllowance: true,
      excludeFromHousehold: false,
      firstname: '',
      lastname: ''
    }));
  });

});
