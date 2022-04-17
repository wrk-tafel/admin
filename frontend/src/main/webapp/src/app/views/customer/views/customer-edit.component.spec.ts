import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ModalModule } from 'ngx-bootstrap/modal';
import { of } from 'rxjs';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';
import { AddPersonFormComponent } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { CustomerEditComponent } from './customer-edit.component';

describe('CustomerEditComponent', () => {
  const testCustomerData: CustomerFormData = {
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: new Date(1960, 3, 10),
    country: 'AT',
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
    incomeDue: new Date()
  };
  const testAddPersonsData = [
    { lastname: 'Add', firstname: 'Pers 1', birthDate: new Date(1987, 6, 14), income: 50 },
    { lastname: 'Add', firstname: 'Pers 2', birthDate: new Date(1987, 6, 14), income: 80 }
  ];
  const testCustomerRequestData: CustomerData = {
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: new Date(1960, 3, 10),
    country: 'AT',
    telephoneNumber: 6641231231,
    email: 'max.mustermann@gmail.com',

    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      stairway: '1',
      door: '21',
      postalCode: 1020,
      city: 'Wien'
    },

    employer: 'test employer',
    income: 1000,
    incomeDue: new Date(),

    additionalPersons: [
      { lastname: 'Add', firstname: 'Pers 1', birthDate: new Date(1987, 6, 14), income: 50 },
      { lastname: 'Add', firstname: 'Pers 2', birthDate: new Date(1987, 6, 14), income: 80 }
    ]
  };

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
          useValue: jasmine.createSpyObj('CustomerApiService', ['validate'])
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
  }));

  it('initial checks', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeTruthy();
  });

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
    expect(fixture.nativeElement.querySelector('[testid=personcard-0]')).toBeTruthy();
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
    fixture.nativeElement.querySelector('[testid=remove-personcard-0]').click();

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
      lastname: testCustomerRequestData.lastname,
      firstname: testCustomerRequestData.firstname,
      birthDate: '1960-04-09',
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
      incomeDue: '2022-04-17',

      additionalPersons: [
        { lastname: addPers1.lastname, firstname: addPers1.firstname, birthDate: '1987-07-13', income: addPers1.income },
        { lastname: addPers2.lastname, firstname: addPers2.firstname, birthDate: '1987-07-13', income: addPers2.income }
      ]
    }));

    expect(component.validationResultModal.show).toHaveBeenCalled();
  });

  it('validate - forms valid but not data not valid', () => {
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

});
