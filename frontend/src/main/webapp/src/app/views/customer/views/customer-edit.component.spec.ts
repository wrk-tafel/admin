import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import * as moment from 'moment';
import { ModalModule } from 'ngx-bootstrap/modal';
import { of } from 'rxjs';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';
import { AddPersonFormComponent } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { CustomerEditComponent } from './customer-edit.component';
import expect from 'jasmine-core';

describe('CustomerEditComponent', () => {
  const testCustomerData: CustomerFormData = {
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(40, 'years').startOf('day').utc().toDate(),
    country: {
      id: 0,
      code: 'AT',
      name: 'Österreich'
    },
    telephoneNumber: 6641231231,
    email: 'max.mustermann@gmail.com',

    street: 'Teststraße',
    houseNumber: '123A',
    stairway: '1',
    door: '21',
    postalCode: 1020,
    city: 'Wien',

    employer: 'test employer',
    income: 1000,
    incomeDue: moment().add(1, 'years').startOf('day').utc().toDate()
  };
  const testAddPersonsData = [
    { lastname: 'Add', firstname: 'Pers 1', birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(), income: 50 },
    { lastname: 'Add', firstname: 'Pers 2', birthDate: moment().subtract(2, 'years').startOf('day').utc().toDate(), income: 80 }
  ];
  const testCustomerRequestData: CustomerData = {
    id: 123,
    lastname: testCustomerData.lastname,
    firstname: testCustomerData.firstname,
    birthDate: moment(testCustomerData.birthDate).startOf('day').utc().toDate(),
    country: {
      id: testCustomerData.country.id,
      code: testCustomerData.country.code,
      name: testCustomerData.country.name
    },
    telephoneNumber: testCustomerData.telephoneNumber,
    email: testCustomerData.email,

    address: {
      street: testCustomerData.street,
      houseNumber: testCustomerData.houseNumber,
      stairway: testCustomerData.stairway,
      door: testCustomerData.door,
      postalCode: testCustomerData.postalCode,
      city: testCustomerData.city
    },

    employer: testCustomerData.employer,
    income: testCustomerData.income,
    incomeDue: moment(testCustomerData.incomeDue).startOf('day').utc().toDate(),

    additionalPersons: [
      {
        lastname: testAddPersonsData[0].lastname,
        firstname: testAddPersonsData[0].firstname,
        birthDate: moment(testAddPersonsData[0].birthDate).startOf('day').utc().toDate(),
        income: testAddPersonsData[0].income
      },
      {
        lastname: testAddPersonsData[1].lastname,
        firstname: testAddPersonsData[1].firstname,
        birthDate: moment(testAddPersonsData[1].birthDate).startOf('day').utc().toDate(),
        income: testAddPersonsData[1].income
      }
    ]
  };

  let router: jasmine.SpyObj<Router>;
  let apiService: jasmine.SpyObj<CustomerApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        ModalModule.forRoot()
      ],
      declarations: [
        CustomerEditComponent,
        CustomerFormComponent,
        AddPersonFormComponent
      ],
      providers: [
        {
          provide: CustomerApiService,
          useValue: jasmine.createSpyObj('CustomerApiService', ['validate', 'createCustomer', 'getCustomer'])
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: testCustomerRequestData.id })
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
  }));

  it('initial checks', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeTruthy();
  });

  it('initial data loaded', waitForAsync(() => {
    apiService.getCustomer.withArgs(testCustomerRequestData.id).and.returnValue(of(testCustomerRequestData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(component.customerData).toEqual(testCustomerData);
    expect(component.additionalPersonsData).toEqual(testAddPersonsData);
  }));

  it('addNewPerson', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);
    expect(component.additionalPersonsData.length).toBe(0);

    fixture.nativeElement.querySelector('[testid=addperson-button]').click();
    fixture.detectChanges();

    expect(component.additionalPersonsData.length).toBe(1);
    expect(component.additionalPersonsData[0].uuid).toBeDefined();
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid=personform-0]')).toBeTruthy();
    expect(component.saveDisabled).toBe(true);
  });

  it('removePerson', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData.length).toBe(1);

    fixture.detectChanges();
    fixture.nativeElement.querySelector('[testid=remove-personform-0]').click();

    fixture.detectChanges();
    expect(component.additionalPersonsData.length).toBe(0);
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid=personcard-0]')).toBeNull();
    expect(component.saveDisabled).toBe(true);
  });

  it('trackBy', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    const testUuid = 'test-UUID';

    const trackingId = component.trackBy(0, { uuid: testUuid });

    expect(trackingId).toBe(testUuid);
  });

  it('updateCustomerFormData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    expect(component.customerData).toBe(undefined);

    component.updatedCustomerFormData();

    expect(component.saveDisabled).toBe(true);
  });

  it('updatePersonsFormData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData[0]).toEqual(existingData);

    component.updatedPersonsFormData();

    expect(component.saveDisabled).toEqual(true);
  });

  it('validate - forms invalid', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.saveDisabled = false;

    expect(component.customerFormComponent.customerForm.get('lastname').touched).toBe(false);
    expect(component.saveDisabled).toBe(false);

    component.validate();

    expect(component.customerFormComponent.customerForm.get('lastname').touched).toBe(true);
    expect(component.saveDisabled).toBe(true);
    expect(component.errorMessage).toBe('Bitte Eingaben überprüfen!');
  });

  it('validate - forms valid', () => {
    const validationResult = {
      valid: true,
      totalSum: 0,
      limit: 0,
      toleranceValue: 0,
      amountExceededLimit: 0
    };
    apiService.validate.and.returnValue(of(validationResult));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerData = testCustomerData;
    component.additionalPersonsData = testAddPersonsData;
    fixture.detectChanges();
    spyOn(component.validationResultModal, 'show');
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);

    component.validate();

    expect(component.saveDisabled).toBe(false);

    const addPers1 = testCustomerRequestData.additionalPersons[0];
    const addPers2 = testCustomerRequestData.additionalPersons[1];
    expect(apiService.validate).toHaveBeenCalledWith(jasmine.objectContaining({
      id: '',
      lastname: testCustomerRequestData.lastname,
      firstname: testCustomerRequestData.firstname,
      birthDate: moment(testCustomerRequestData.birthDate).startOf('day').utc().format('YYYY-MM-DD'),
      country: testCustomerRequestData.country,
      telephoneNumber: testCustomerRequestData.telephoneNumber,
      email: testCustomerRequestData.email,
      address: {
        street: testCustomerRequestData.address.street,
        houseNumber: testCustomerRequestData.address.houseNumber,
        stairway: testCustomerRequestData.address.stairway,
        door: testCustomerRequestData.address.door,
        postalCode: testCustomerRequestData.address.postalCode,
        city: testCustomerRequestData.address.city
      },

      employer: testCustomerRequestData.employer,
      income: testCustomerRequestData.income,
      incomeDue: moment(testCustomerRequestData.incomeDue).startOf('day').utc().format('YYYY-MM-DD'),

      additionalPersons: [
        {
          lastname: addPers1.lastname,
          firstname: addPers1.firstname,
          birthDate: moment(addPers1.birthDate).startOf('day').utc().format('YYYY-MM-DD'),
          income: addPers1.income
        },
        {
          lastname: addPers2.lastname,
          firstname: addPers2.firstname,
          birthDate: moment(addPers2.birthDate).startOf('day').utc().format('YYYY-MM-DD'),
          income: addPers2.income
        }
      ]
    }));

    expect(component.validationResultModal.show).toHaveBeenCalled();
  });

  it('validate - forms valid but data is not valid', () => {
    const validationResult = {
      valid: false,
      totalSum: 0,
      limit: 0,
      toleranceValue: 0,
      amountExceededLimit: 0
    };
    apiService.validate.and.returnValue(of(validationResult));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerData = testCustomerData;
    component.additionalPersonsData = testAddPersonsData;
    fixture.detectChanges();
    spyOn(component.validationResultModal, 'show');
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);

    component.validate();

    expect(component.saveDisabled).toBe(true);
    expect(component.validationResultModal.show).toHaveBeenCalled();
  });

  it('save successful', () => {
    apiService.createCustomer.and.returnValue(of(testCustomerRequestData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerData = testCustomerData;
    component.additionalPersonsData = testAddPersonsData;
    fixture.detectChanges();

    component.save();

    const addPers1 = testCustomerRequestData.additionalPersons[0];
    const addPers2 = testCustomerRequestData.additionalPersons[1];
    expect(apiService.createCustomer).toHaveBeenCalledWith(jasmine.objectContaining({
      lastname: testCustomerRequestData.lastname,
      firstname: testCustomerRequestData.firstname,
      birthDate: moment(testCustomerRequestData.birthDate).startOf('day').utc().format('YYYY-MM-DD'),
      country: testCustomerRequestData.country,
      telephoneNumber: testCustomerRequestData.telephoneNumber,
      email: testCustomerRequestData.email,
      address: {
        street: testCustomerRequestData.address.street,
        houseNumber: testCustomerRequestData.address.houseNumber,
        stairway: testCustomerRequestData.address.stairway,
        door: testCustomerRequestData.address.door,
        postalCode: testCustomerRequestData.address.postalCode,
        city: testCustomerRequestData.address.city
      },

      employer: testCustomerRequestData.employer,
      income: testCustomerRequestData.income,
      incomeDue: moment(testCustomerRequestData.incomeDue).startOf('day').utc().format('YYYY-MM-DD'),

      additionalPersons: [
        {
          lastname: addPers1.lastname,
          firstname: addPers1.firstname,
          birthDate: moment(addPers1.birthDate).startOf('day').utc().format('YYYY-MM-DD'),
          income: addPers1.income
        },
        {
          lastname: addPers2.lastname,
          firstname: addPers2.firstname,
          birthDate: moment(addPers2.birthDate).startOf('day').utc().format('YYYY-MM-DD'),
          income: addPers2.income
        }
      ]
    }));

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerRequestData.id]);
  });

});
