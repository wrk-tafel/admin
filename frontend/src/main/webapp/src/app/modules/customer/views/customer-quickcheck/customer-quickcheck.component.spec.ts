import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import dayjs from 'dayjs';
import {CustomerApiService, ValidateCustomerResponse} from '../../../../api/customer-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {CustomerQuickCheckComponent} from './customer-quickcheck.component';
import {ValidationResultDialogComponent} from '../customer-edit/dialogs/validation-result-dialog.component';

describe('CustomerQuickCheckComponent', () => {
  let apiService: MockedObject<CustomerApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let matDialog: MockedObject<MatDialog>;

  const testValidationResult: ValidateCustomerResponse = {
    valid: true,
    totalSum: 1000,
    limit: 2000,
    toleranceValue: 100,
    amountExceededLimit: 0,
    details: {
      incomeSum: 1000,
      familyAllowanceSum: 0,
      childTaxAllowanceSum: 0,
      siblingAdditionSum: 0,
      baseLimit: 1900,
      baseLimitCountAdults: 1,
      baseLimitCountChildren: 0,
      additionalAdultsCount: 0,
      additionalAdultsSum: 0,
      additionalChildrenCount: 0,
      additionalChildrenSum: 0
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockReturnValue({afterClosed: () => of(true)})
          }
        },
        {
          provide: CustomerApiService,
          useValue: {
            quickCheck: vi.fn().mockName('CustomerApiService.quickCheck')
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error')
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {snapshot: {data: {}}}
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  });

  it('starts with three persons; only the first lacks the family-allowance checkbox and remove button', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[testid^="quickcheck-person-"]').length).toBe(3);
    expect(fixture.nativeElement.querySelector('[testid="receivesFamilyAllowanceInput-0"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid="remove-person-0"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid="receivesFamilyAllowanceInput-1"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid="remove-person-2"]')).toBeTruthy();
    // the pre-created additional rows default to receiving family allowance, like added ones
    expect(component.quickCheckForm.persons().value()[1].receivesFamilyAllowance).toBe(true);
    expect(component.quickCheckForm.persons().value()[2].receivesFamilyAllowance).toBe(true);
  });

  it('adds and removes persons; added persons default to receiving family allowance', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.addPerson();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[testid^="quickcheck-person-"]').length).toBe(4);
    expect(component.quickCheckForm.persons().value()[3].receivesFamilyAllowance).toBe(true);

    component.removePerson(3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[testid^="quickcheck-person-"]').length).toBe(3);
  });

  it('rejects a check while no person has a birthdate yet', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.check();

    expect(toastr.error).toHaveBeenCalledWith('Bitte mindestens ein Geburtsdatum erfassen!');
    expect(apiService.quickCheck).not.toHaveBeenCalled();
  });

  it('rejects a check while a person has an income but no birthdate', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.personField(0).income().value.set(1000);

    component.check();

    expect(toastr.error).toHaveBeenCalledWith('Bitte Eingaben überprüfen!');
    expect(apiService.quickCheck).not.toHaveBeenCalled();
  });

  it('sends only the persons with a birthdate and shows the result dialog', () => {
    apiService.quickCheck.mockReturnValue(of(testValidationResult));

    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mainBirthDate = dayjs().subtract(30, 'years').startOf('day').toDate();
    const childBirthDate = dayjs().subtract(5, 'years').startOf('day').toDate();

    component.personField(0).birthDate().value.set(mainBirthDate);
    component.personField(0).income().value.set(1000);
    component.personField(1).birthDate().value.set(childBirthDate);
    // the third default row stays empty and must not be part of the request

    component.check();

    expect(apiService.quickCheck).toHaveBeenCalledWith([
      {birthDate: mainBirthDate, income: 1000, receivesFamilyAllowance: false},
      {birthDate: childBirthDate, income: undefined, receivesFamilyAllowance: true}
    ]);
    expect(matDialog.open).toHaveBeenCalledWith(ValidationResultDialogComponent, {
      data: {validationResult: testValidationResult}
    });
  });

  it('hands only persons with a birthdate over to the "Kunden anlegen" link state', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mainBirthDate = dayjs().subtract(30, 'years').startOf('day').toDate();

    component.personField(0).birthDate().value.set(mainBirthDate);
    component.personField(0).income().value.set(1000);
    // the two empty default rows must not be handed over

    expect(component.createCustomerState()).toEqual({
      quickCheckPersons: [
        {birthDate: mainBirthDate, income: 1000, receivesFamilyAllowance: false}
      ]
    });
  });

  it('leaves error presentation to the interceptor toast when the check fails', () => {
    apiService.quickCheck.mockReturnValue(throwError(() => new Error('composition not configured')));

    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.personField(0).birthDate().value.set(dayjs().subtract(30, 'years').startOf('day').toDate());

    component.check();

    expect(matDialog.open).not.toHaveBeenCalled();
  });
});
