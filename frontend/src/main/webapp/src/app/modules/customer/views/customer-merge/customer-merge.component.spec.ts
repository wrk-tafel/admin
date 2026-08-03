import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {
  CustomerApiService,
  CustomerData,
  CustomerMergePreview,
  CustomerMergeResult,
  Gender
} from '../../../../api/customer-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {CustomerMergeComponent} from './customer-merge.component';

describe('CustomerMergeComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<TafelToastrService>;

  const mockTarget: CustomerData = {
    id: 100,
    firstname: 'Max',
    lastname: 'Mustermann',
    gender: Gender.MALE,
    address: {street: 'Teststraße', houseNumber: '1', postalCode: 1010, city: 'Wien'},
    telephoneNumber: '111'
  };

  const mockSource: CustomerData = {
    id: 200,
    firstname: 'Maximilian',
    lastname: 'Mustermann',
    gender: Gender.MALE,
    address: {street: 'Teststraße', houseNumber: '1', postalCode: 1010, city: 'Wien'},
    telephoneNumber: '222'
  };

  const mockPreview: CustomerMergePreview = {
    target: mockTarget,
    sources: [mockSource],
    fieldConflicts: [
      {field: 'TELEPHONE_NUMBER', conflictingSourceCustomerIds: [200]}
    ],
    persons: [
      {
        sourceCustomerId: 200,
        person: {
          key: 'anna',
          id: 5,
          firstname: 'Anna',
          lastname: 'Schmidt',
          excludeFromHousehold: false,
          receivesFamilyAllowance: false
        },
        duplicate: false
      }
    ],
    distributionCollisions: [],
    noteCount: 1,
    documentCount: 0
  };

  const mockMergeResult: CustomerMergeResult = {
    target: mockTarget,
    movedPersonCount: 1,
    droppedDuplicatePersonCount: 0,
    movedNoteCount: 1,
    movedDocumentCount: 0,
    movedDistributionCount: 0,
    droppedDistributionCount: 0,
    deletedCustomerIds: [200]
  };

  beforeEach(() => {
    const customerApiServiceSpy = {
      getMergePreview: vi.fn().mockName('CustomerApiService.getMergePreview'),
      mergeCustomers: vi.fn().mockName('CustomerApiService.mergeCustomers')
    } as any;
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate')
    } as any;
    const toastrSpy = {
      error: vi.fn().mockName('TafelToastrService.error'),
      success: vi.fn().mockName('TafelToastrService.success')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: CustomerApiService, useValue: customerApiServiceSpy},
        {provide: Router, useValue: routerSpy},
        {provide: ActivatedRoute, useValue: {snapshot: {data: {customerMergePreviewData: mockPreview}}}},
        {provide: TafelToastrService, useValue: toastrSpy}
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  function createComponent() {
    const fixture = TestBed.createComponent(CustomerMergeComponent);
    fixture.componentRef.setInput('customerMergePreviewData', mockPreview);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('component can be created', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('conflicting fields are detected from the preview', () => {
    const component = createComponent();

    expect(component.conflictingFields()).toEqual(['TELEPHONE_NUMBER']);
    expect(component.identicalFields()).not.toContain('TELEPHONE_NUMBER');
  });

  it('a conflicting field defaults to the target value', () => {
    const component = createComponent();

    expect(component.selectedSourceIdFor('TELEPHONE_NUMBER')).toBeUndefined();
    expect(component.resolvedDisplayValue('TELEPHONE_NUMBER')).toBe('111');
  });

  it('selecting a source updates the resolved value', () => {
    const component = createComponent();

    component.selectField('TELEPHONE_NUMBER', 200);

    expect(component.selectedSourceIdFor('TELEPHONE_NUMBER')).toBe(200);
    expect(component.resolvedDisplayValue('TELEPHONE_NUMBER')).toBe('222');
  });

  it('confirm sends the chosen field selections and navigates to the target on success', () => {
    const component = createComponent();
    component.selectField('TELEPHONE_NUMBER', 200);
    customerApiService.mergeCustomers.mockReturnValue(of(mockMergeResult));

    component.confirm();

    expect(customerApiService.mergeCustomers).toHaveBeenCalledWith(
      100,
      [200],
      [{field: 'TELEPHONE_NUMBER', sourceCustomerId: 200}]
    );
    expect(toastr.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', 100]);
  });

  it('confirm shows an error toast and does not navigate on failure', () => {
    const component = createComponent();
    customerApiService.mergeCustomers.mockReturnValue(throwError(() => ({status: 500})));

    component.confirm();

    expect(toastr.error).toHaveBeenCalledWith('Zusammenführen der Kunden fehlgeschlagen!');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('cancel navigates back to the duplicates list', () => {
    const component = createComponent();

    component.cancel();

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/duplikate']);
  });

});
