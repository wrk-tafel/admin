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

  it('starts with a single person that has no family-allowance checkbox and no remove button', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[testid^="quickcheck-person-"]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[testid="receivesFamilyAllowanceInput-0"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid="remove-person-0"]')).toBeNull();
  });

  it('adds and removes persons; added persons default to receiving family allowance', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.addPerson();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[testid^="quickcheck-person-"]').length).toBe(2);
    expect(fixture.nativeElement.querySelector('[testid="receivesFamilyAllowanceInput-1"]')).toBeTruthy();
    expect(component.quickCheckForm.persons().value()[1].receivesFamilyAllowance).toBe(true);

    component.removePerson(1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[testid^="quickcheck-person-"]').length).toBe(1);
  });

  it('rejects a check while a birthdate is still missing', () => {
    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.check();

    expect(toastr.error).toHaveBeenCalledWith('Bitte Eingaben überprüfen!');
    expect(apiService.quickCheck).not.toHaveBeenCalled();
  });

  it('sends the entered persons and shows the result dialog', () => {
    apiService.quickCheck.mockReturnValue(of(testValidationResult));

    const fixture = TestBed.createComponent(CustomerQuickCheckComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mainBirthDate = dayjs().subtract(30, 'years').startOf('day').toDate();
    const childBirthDate = dayjs().subtract(5, 'years').startOf('day').toDate();

    component.personField(0).birthDate().value.set(mainBirthDate);
    component.personField(0).income().value.set(1000);
    component.addPerson();
    component.personField(1).birthDate().value.set(childBirthDate);

    component.check();

    expect(apiService.quickCheck).toHaveBeenCalledWith([
      {birthDate: mainBirthDate, income: 1000, receivesFamilyAllowance: false},
      {birthDate: childBirthDate, income: undefined, receivesFamilyAllowance: true}
    ]);
    expect(matDialog.open).toHaveBeenCalledWith(ValidationResultDialogComponent, {
      data: {validationResult: testValidationResult}
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
