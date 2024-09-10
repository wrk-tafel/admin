import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import * as moment from 'moment';
import {of} from 'rxjs';
import {CustomerApiService, CustomerData, Gender} from '../../../../api/customer-api.service';
import {CustomerEditComponent} from './customer-edit.component';
import {
  BgColorDirective,
  CardModule,
  ColComponent,
  InputGroupComponent,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('CustomerEditComponent - Editing an existing customer', () => {
  const testCountry = {
    id: 0,
    code: 'AT',
    name: 'Österreich'
  };
  const testCountry2 = {
    id: 1,
    code: 'DE',
    name: 'Deutschland'
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
        country: testCountry2,
        excludeFromHousehold: true,
        receivesFamilyBonus: false
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
        ModalModule,
        NoopAnimationsModule,
        CardModule,
        InputGroupComponent,
        RowComponent,
        ColComponent,
        BgColorDirective
      ],
      providers: [
        {
          provide: CustomerApiService,
          useValue: jasmine.createSpyObj('CustomerApiService', ['validate', 'getCustomer', 'createCustomer', 'updateCustomer'])
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                customerData: testCustomerData
              }
            }
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
  }));

  it('initial checks', waitForAsync(() => {
    apiService.getCustomer.withArgs(testCustomerData.id).and.returnValue(of(testCustomerData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.editMode).toBeTrue();
    expect(component.customerValidForSave).toBeFalse();
  }));

  it('existing customer saved successfully', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);
    apiService.getCustomer.withArgs(testCustomerData.id).and.returnValue(of(testCustomerData));
    apiService.updateCustomer.withArgs(testCustomerData).and.returnValue(of(testCustomerData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.ngOnInit();
    component.customerUpdated = component.customerData;
    component.customerValidForSave = true;

    component.save();

    expect(component.isSaveEnabled()).toBeTrue();
    expect(component.editMode).toBeTrue();
    expect(component.customerData).toEqual(testCustomerData);
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.updateCustomer).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('existing customer saved successfully even when not entitled', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(true);
    apiService.getCustomer.withArgs(testCustomerData.id).and.returnValue(of(testCustomerData));
    apiService.updateCustomer.withArgs(testCustomerData).and.returnValue(of(testCustomerData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.ngOnInit();
    component.customerUpdated = component.customerData;
    component.customerValidForSave = false;

    component.save();
    fixture.detectChanges();

    expect(component.isSaveEnabled()).toBeTrue();
    expect(component.editMode).toBeTrue();
    expect(component.customerData).toEqual(testCustomerData);
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.updateCustomer).toHaveBeenCalledWith(jasmine.objectContaining(testCustomerData));
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('existing customer save failed when form is invalid', () => {
    const customerFormComponent = jasmine.createSpyObj('CustomerFormComponent', ['markAllAsTouched', 'isValid']);
    customerFormComponent.isValid.and.returnValue(false);
    apiService.updateCustomer.withArgs(testCustomerData).and.returnValue(of(testCustomerData));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.customerFormComponent = customerFormComponent;
    component.customerUpdated = component.customerData;
    component.ngOnInit();

    component.save();

    expect(component.isSaveEnabled()).toBeFalse();
    expect(component.editMode).toBeTrue();
    expect(component.customerData).toEqual(testCustomerData);
    expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.updateCustomer).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

});
