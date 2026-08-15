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
  let activatedRouteStub: { snapshot: { data: object, queryParams: Record<string, string> } };

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

  const mockSecondSource: CustomerData = {
    id: 300,
    firstname: 'Maxi',
    lastname: 'Mustermann',
    gender: Gender.MALE,
    address: {street: 'Teststraße', houseNumber: '1', postalCode: 1010, city: 'Wien'},
    telephoneNumber: '111'
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
    activatedRouteStub = {snapshot: {data: {customerMergePreviewData: mockPreview}, queryParams: {}}};

    TestBed.configureTestingModule({
      providers: [
        {provide: CustomerApiService, useValue: customerApiServiceSpy},
        {provide: Router, useValue: routerSpy},
        {provide: ActivatedRoute, useValue: activatedRouteStub},
        {provide: TafelToastrService, useValue: toastrSpy}
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  function createComponent(preview: CustomerMergePreview = mockPreview) {
    const fixture = TestBed.createComponent(CustomerMergeComponent);
    fixture.componentRef.setInput('customerMergePreviewData', preview);
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

  it('the conflict grid holds one column per customer, target first', () => {
    const component = createComponent();

    expect(component.columns().map(column => column.customer.id)).toEqual([100, 200]);
    expect(component.columns()[0].isTarget).toBe(true);
    expect(component.columns()[0].label).toBe('100 - Mustermann Max');
  });

  it('a source that carries the target value gets a cell that cannot be selected', () => {
    const component = createComponent({
      ...mockPreview,
      sources: [mockSource, mockSecondSource]
    });

    const cells = component.conflictRows()[0].cells;

    expect(cells.map(cell => cell.customerId)).toEqual([100, 200, 300]);
    expect(cells.map(cell => cell.selectable)).toEqual([true, true, false]);
    expect(cells.map(cell => cell.selected)).toEqual([true, false, false]);
    expect(cells[2].value).toBe('111');
    expect(cells[1].testId).toBe('merge-field-TELEPHONE_NUMBER-source-200');
  });

  it('the selected cell follows the picked value', () => {
    const component = createComponent();

    component.selectField('TELEPHONE_NUMBER', 200);

    expect(component.conflictRows()[0].cells.map(cell => cell.selected)).toEqual([false, true]);
  });

  it('only the fields a source value won are marked as changed', () => {
    const component = createComponent();
    component.selectField('TELEPHONE_NUMBER', 200);

    const changedRows = component.changedSummaryRows();

    expect(changedRows.map(row => row.field)).toEqual(['TELEPHONE_NUMBER']);
    expect(changedRows[0].value).toBe('222');
    expect(changedRows[0].previousValue).toBe('111');
    expect(component.summaryRows().find(row => row.field === 'EMAIL')!.changed).toBe(false);
  });

  it('persons are grouped by their source customer and keep their position in the preview', () => {
    const component = createComponent({
      ...mockPreview,
      sources: [mockSource, mockSecondSource],
      persons: [
        ...mockPreview.persons,
        {
          sourceCustomerId: 300,
          person: {
            key: 'peter',
            id: 6,
            firstname: 'Peter',
            lastname: 'Novak',
            excludeFromHousehold: false,
            receivesFamilyAllowance: false
          },
          duplicate: true
        }
      ]
    });

    const groups = component.personGroups();

    expect(groups.map(group => group.sourceCustomerId)).toEqual([200, 300]);
    expect(groups[1].label).toBe('300 - Mustermann Maxi');
    expect(groups[1].entries[0].index).toBe(1);
    expect(component.movedPersonCount()).toBe(1);
    expect(component.droppedPersonCount()).toBe(1);
  });

  it('confirm does nothing until the deletion is acknowledged', () => {
    const component = createComponent();

    component.confirm();

    expect(customerApiService.mergeCustomers).not.toHaveBeenCalled();
  });

  it('confirm sends the chosen field selections and navigates to the target on success', () => {
    const component = createComponent();
    component.selectField('TELEPHONE_NUMBER', 200);
    component.confirmationAccepted.set(true);
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

  it('a second confirm while the merge is running is ignored', () => {
    const component = createComponent();
    component.confirmationAccepted.set(true);
    customerApiService.mergeCustomers.mockReturnValue(of());

    component.confirm();
    component.confirm();

    expect(customerApiService.mergeCustomers).toHaveBeenCalledTimes(1);
  });

  it('confirm shows an error toast and does not navigate on failure', () => {
    const component = createComponent();
    component.confirmationAccepted.set(true);
    customerApiService.mergeCustomers.mockReturnValue(throwError(() => ({status: 500})));

    component.confirm();

    expect(toastr.error).toHaveBeenCalledWith('Zusammenführen der Kunden fehlgeschlagen!');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.merging()).toBe(false);
  });

  it('cancel navigates back to the duplicates list', () => {
    const component = createComponent();

    component.cancel();

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/duplikate']);
  });

  it('cancel returns to the duplicates page the merge was started from', () => {
    activatedRouteStub.snapshot.queryParams['seite'] = '3';
    const component = createComponent();

    component.cancel();

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/duplikate'], {queryParams: {seite: '3'}});
  });

});
