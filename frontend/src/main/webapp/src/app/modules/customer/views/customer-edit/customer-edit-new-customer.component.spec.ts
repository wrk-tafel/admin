import type {MockedObject} from 'vitest';
import {of, throwError} from 'rxjs';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import dayjs from 'dayjs';
import {
  CustomerApiService,
  CustomerData,
  Gender,
  IncomeCalculationDetails
} from '../../../../api/customer-api.service';
import {CustomerEditComponent} from './customer-edit.component';
import {By} from '@angular/platform-browser';
import {MatDialog} from '@angular/material/dialog';
import {HttpErrorResponse, provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('CustomerEditComponent - Creating a new customer', () => {

  const testValidationDetails: IncomeCalculationDetails = {
    incomeSum: 1000,
    familyAllowanceSum: 0,
    childTaxAllowanceSum: 0,
    siblingAdditionSum: 0,
    baseLimit: 900,
    baseLimitCountAdults: 1,
    baseLimitCountChildren: 0,
    additionalAdultsCount: 0,
    additionalAdultsSum: 0,
    additionalChildrenCount: 0,
    additionalChildrenSum: 0
  };

  const testCountry = {
    id: 0,
    code: 'AT',
    name: 'Österreich'
  };
  const testCustomerData: CustomerData = {
    id: 123,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: dayjs().subtract(40, 'years').startOf('day').toDate(),
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
    incomeDue: dayjs().add(1, 'years').startOf('day').toDate(),
    validUntil: dayjs().add(1, 'years').startOf('day').toDate(),
    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Add',
        firstname: 'Pers 1',
        birthDate: dayjs().subtract(5, 'years').startOf('day').toDate(),
        gender: Gender.FEMALE,
        country: testCountry,
        income: 50,
        incomeDue: dayjs().add(1, 'years').startOf('day').toDate(),
        excludeFromHousehold: false,
        receivesFamilyAllowance: true
      },
      {
        key: 1,
        id: 1,
        lastname: 'Add',
        firstname: 'Pers 2',
        birthDate: dayjs().subtract(2, 'years').startOf('day').toDate(),
        gender: Gender.MALE,
        country: testCountry,
        excludeFromHousehold: true,
        receivesFamilyAllowance: false
      }
    ]
  };

  let router: MockedObject<Router>;
  let apiService: MockedObject<CustomerApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let matDialog: MockedObject<MatDialog>;

  function configureTestBed(navigationState?: Record<string, unknown>) {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockReturnValue({afterClosed: () => of(true)})
          }
        },
        {
          provide: CustomerApiService,
          useValue: {
            validate: vi.fn().mockName('CustomerApiService.validate'),
            createCustomer: vi.fn().mockName('CustomerApiService.createCustomer')
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockName('Router.navigate'),
            getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation')
              .mockReturnValue(navigationState ? {extras: {state: navigationState}} : null)
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
          }
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

    router = TestBed.inject(Router) as MockedObject<Router>;
    apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  }

  beforeEach(() => configureTestBed());

  it('initial checks', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="nopersons-label"]'))).toBeTruthy();
    expect(component.editMode()).toBe(false);
  });

  it('prefills first/last name from navigation state (reached from the search screen\'s empty-state CTA)', () => {
    TestBed.resetTestingModule();
    configureTestBed({vorname: 'Max', nachname: 'Mustermann'});

    const fixture = TestBed.createComponent(CustomerEditComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="firstnameInput"]')).nativeElement.value).toBe('Max');
    expect(fixture.debugElement.query(By.css('[testid="lastnameInput"]')).nativeElement.value).toBe('Mustermann');
  });

  it('prefills persons handed over from the quick-check screen via navigation state', () => {
    TestBed.resetTestingModule();
    // birthdates arrive as 'YYYY-MM-DD' strings, exactly as the quick-check's native date inputs provide them
    configureTestBed({
      quickCheckPersons: [
        {birthDate: '1990-05-12', income: 1000, receivesFamilyAllowance: false},
        {birthDate: '2015-01-01', income: undefined, receivesFamilyAllowance: true}
      ]
    });

    const fixture = TestBed.createComponent(CustomerEditComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="birthDateInput"]')).nativeElement.value)
      .toBe('1990-05-12');
    expect(fixture.debugElement.query(By.css('[testid="incomeInput"]')).nativeElement.value).toBe('1000');
    // the handed-over child arrives as a collapsed additional person
    expect(fixture.debugElement.query(By.css('[testid="personform-header-0"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="nopersons-label"]'))).toBeNull();
  });

  it('new customer saved successfully', () => {
    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(true);

    const mockResponse = {
      data: testCustomerData,
      errorMsg: null
    };
    apiService.createCustomer.mockReturnValue(of(mockResponse));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    component.save();

    expect(component.editMode()).toBe(false);
    expect(customerFormComponentMock.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
      lastname: testCustomerData.lastname,
      firstname: testCustomerData.firstname,
      birthDate: testCustomerData.birthDate
    }), false, expect.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('new customer save failed - form invalid', () => {
    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(false);

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    component.save();

    expect(component.isSaveEnabled()).toBe(false);
    expect(customerFormComponentMock.markAllAsTouched).toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalledWith('Bitte Eingaben überprüfen!');
    expect(apiService.createCustomer).not.toHaveBeenCalledWith(expect.objectContaining(testCustomerData));
    expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('new customer validated successfully', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(true);

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    apiService.validate.mockReturnValue(of({
      valid: true,
      limit: 1000,
      amountExceededLimit: 0,
      toleranceValue: 100,
      totalSum: 1000,
      details: testValidationDetails
    }));

    component.validate();

    expect(component.isSaveEnabled()).toBe(true);
    expect(customerFormComponentMock.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.validate).toHaveBeenCalledWith(expect.objectContaining(testCustomerData));
    expect(matDialog.open).toHaveBeenCalled();
  });

  it('new customer validation failed', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);
    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(true);

    apiService.validate.mockReturnValue(of({
      valid: false,
      limit: 1000,
      amountExceededLimit: 400,
      toleranceValue: 100,
      totalSum: 1500,
      details: testValidationDetails
    }));
    const mockResponse = {
      data: testCustomerData,
      errorMsg: null
    };
    apiService.createCustomer.mockReturnValue(of(mockResponse));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    component.validate();

    expect(matDialog.open).toHaveBeenCalled();
  });

  // the interceptor presents the error itself - all this has to do is not let it escape as an
  // uncaught application error, which is what a subscribe without an error callback would do
  it('new customer validation rejected by the backend opens no dialog and throws nothing', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(true);

    apiService.validate.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: {detail: 'Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: 0, Kinder: 1)!'}
    })));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    expect(() => component.validate()).not.toThrow();
    expect(matDialog.open).not.toHaveBeenCalled();
  });

  it('new customer save with 409 conflict shows confirmation dialog and retries with validation', async () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    const mockMessage = 'Customer has been updated by another user. Do you want to proceed?';
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(true);

    // First call with validate=false, second call with validate=true
    const mockResponse = {
      data: testCustomerData,
      errorMsg: null
    };
    apiService.createCustomer.mockReturnValueOnce(throwError(() => ({
      status: 409,
      error: {detail: mockMessage}
    }))).mockReturnValueOnce(of(mockResponse));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    component.save();

    expect(matDialog.open).toHaveBeenCalledWith(expect.anything(), {
      data: {
        message: mockMessage
      }
    });
    expect(apiService.createCustomer).toHaveBeenNthCalledWith(1, expect.objectContaining(testCustomerData), false, expect.anything());
    expect(apiService.createCustomer).toHaveBeenNthCalledWith(2, expect.objectContaining(testCustomerData), true, expect.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
  });

  it('new customer save with non-409 error shows error toast', () => {
    const customerFormComponentMock = {
      markAllAsTouched: vi.fn().mockName('CustomerFormComponent.markAllAsTouched'),
      valid: vi.fn().mockName('CustomerFormComponent.valid'),
      dirty: vi.fn().mockName('CustomerFormComponent.dirty').mockReturnValue(false)
    } as any;
    customerFormComponentMock.valid.mockReturnValue(true);

    apiService.createCustomer.mockReturnValue(throwError(() => ({
      status: 500,
      error: {detail: 'Internal server error'}
    })));

    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    Object.defineProperty(component, 'customerFormComponent', {
      get: () => () => customerFormComponentMock
    });
    component.customerUpdated.set(testCustomerData);

    component.save();

    expect(toastr.error).toHaveBeenCalledWith('Internal server error', 'Speichern fehlgeschlagen!');
    expect(matDialog.open).not.toHaveBeenCalled();
  });

});
