import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import * as moment from 'moment';
import {of} from 'rxjs';
import {CustomerApiService, CustomerData, Gender, ValidateCustomerResponse} from '../../../../api/customer-api.service';
import {CustomerEditComponent} from './customer-edit.component';
import {By} from '@angular/platform-browser';
import {
  BgColorDirective,
  CardModule,
  ColComponent,
  InputGroupComponent,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('CustomerEditComponent - Creating a new customer', () => {

  const testCountry = {
    id: 0,
    code: 'AT',
    name: 'Österreich'
  };
  const testCustomerData: CustomerData = {
    id: 123,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(40, 'years').startOf('day').utc().toDate(),
    gender: Gender.MALE,
    country: testCountry,
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
        gender: Gender.FEMALE,
        country: testCountry,
        income: 50,
        incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
        excludeFromHousehold: false,
        receivesFamilyBonus: true
      },
      {
        key: 1,
        id: 1,
        lastname: 'Add',
        firstname: 'Pers 2',
        birthDate: moment().subtract(2, 'years').startOf('day').utc().toDate(),
        gender: Gender.MALE,
        country: testCountry,
        excludeFromHousehold: true,
        receivesFamilyBonus: false
      }
    ]
  };

  let router: jasmine.SpyObj<Router>;
  let apiService: jasmine.SpyObj<CustomerApiService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        ModalModule,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent,
        BgColorDirective
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomerApiService,
          useValue: jasmine.createSpyObj('CustomerApiService', ['validate', 'createCustomer'])
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {}
            }
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('initial checks', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="nopersons-label"]'))).toBeTruthy();
    expect(component.editMode).toBeFalse();
    expect(component.customerValidForSave).toBeFalse();
  });

  it('new customer saved successfully', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);
    apiService.createCustomer.and.returnValue(of(testCustomerData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.customerUpdated = testCustomerData;
    component.customerValidForSave = true;
    const validationResult: ValidateCustomerResponse = {
      valid: true,
      limit: 1000,
      amountExceededLimit: 0,
      toleranceValue: 10,
      totalSum: 1000
    };
    component.validationResult = validationResult;

    component.save();

    expect(component.isSaveEnabled).toBeTrue();
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

    expect(component.isSaveEnabled).toBeFalse();
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Bitte Eingaben überprüfen!'});
    expect(apiService.createCustomer).not.toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('new customer validated successfully', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);

    component.customerFormComponent = customerFormComponent;
    component.showValidationResultModal = false;
    component.customerUpdated = testCustomerData;

    apiService.validate.and.returnValue(of({
      valid: true,
      limit: 1000,
      amountExceededLimit: 0,
      toleranceValue: 100,
      totalSum: 1000
    }));

    component.validate();

    expect(component.isSaveEnabled).toBeTrue();
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.validate).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(component.customerValidForSave).toBeTrue();
    expect(component.showValidationResultModal).toBeTruthy();
  });

  it('new customer validation failed', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);

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
    component.showValidationResultModal = false;
    component.customerUpdated = testCustomerData;

    component.validate();

    expect(component.isSaveEnabled).toBeFalse();
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.validate).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(component.customerValidForSave).toBeFalse();
    expect(component.showValidationResultModal).toBeTruthy();
  });

});
