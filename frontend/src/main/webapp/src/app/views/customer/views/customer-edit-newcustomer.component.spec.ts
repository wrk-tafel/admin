import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import * as moment from 'moment';
import {ModalModule} from 'ngx-bootstrap/modal';
import {EMPTY, of} from 'rxjs';
import {CustomerApiService, CustomerData} from '../api/customer-api.service';
import {CustomerFormComponent} from '../components/customer-form.component';
import {CustomerEditComponent} from './customer-edit.component';
import {By} from '@angular/platform-browser';

describe('CustomerEditComponent - Creating a new customer', () => {
  const testCustomerData: CustomerData = {
    id: 123,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(40, 'years').startOf('day').utc().toDate(),
    country: {
      id: 0,
      code: 'AT',
      name: 'Österreich'
    },
    telephoneNumber: '00436641231231',
    email: 'max.mustermann@gmail.com',

    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      stairway: '1',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },

    employer: 'test employer',
    income: 1000,
    incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
    validUntil: moment().add(1, 'years').startOf('day').utc().toDate(),

    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Add',
        firstname: 'Pers 1',
        birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(),
        income: 50,
        incomeDue: moment().add(1, 'years').startOf('day').utc().toDate()
      },
      {
        key: 1,
        id: 1,
        lastname: 'Add',
        firstname: 'Pers 2',
        birthDate: moment().subtract(2, 'years').startOf('day').utc().toDate()
      }
    ]
  };

  let router: jasmine.SpyObj<Router>;
  let apiService: jasmine.SpyObj<CustomerApiService>;
  let activatedRoute: ActivatedRoute;

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
        CustomerFormComponent
      ],
      providers: [
        {
          provide: CustomerApiService,
          useValue: jasmine.createSpyObj('CustomerApiService', ['validate', 'createCustomer'])
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: EMPTY
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    activatedRoute = TestBed.inject(ActivatedRoute);
  }));

  it('initial checks', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testId="nopersons-label"]'))).toBeTruthy();
    expect(component.editMode).toBe(false);
    expect(component.customerValidForSave).toBe(false);
    expect(component.errorMessage).toBeUndefined();
  });

  it('new customer saved successfully', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);
    apiService.createCustomer.and.returnValue(of(testCustomerData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.customerUpdated = testCustomerData;

    component.save();

    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.createCustomer).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('new customer save failed - form invalid', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(false);

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.customerUpdated = testCustomerData;

    component.save();

    fixture.detectChanges();
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(component.errorMessage).toBe('Bitte Eingaben überprüfen!');
    expect(apiService.createCustomer).not.toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('new customer validated successfully', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);

    const validationResultModal = jasmine.createSpyObj('ValidationResultModal', ['show']);

    apiService.validate.and.returnValue(of({
      valid: true,
      limit: 1000,
      amountExceededLimit: 0,
      toleranceValue: 100,
      totalSum: 1000
    }));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.validationResultModal = validationResultModal;
    component.customerUpdated = testCustomerData;

    component.validate();

    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.validate).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(component.customerValidForSave).toBe(true);
    expect(validationResultModal.show).toHaveBeenCalled();
  });

  it('new customer validation failed', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);

    const validationResultModal = jasmine.createSpyObj('ValidationResultModal', ['show']);

    apiService.validate.and.returnValue(of({
      valid: false,
      limit: 1000,
      amountExceededLimit: 400,
      toleranceValue: 100,
      totalSum: 1500
    }));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.validationResultModal = validationResultModal;
    component.customerUpdated = testCustomerData;

    component.validate();

    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.validate).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(component.customerValidForSave).toBe(false);
    expect(validationResultModal.show).toHaveBeenCalled();
  });

});
