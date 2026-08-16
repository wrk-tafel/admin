import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import dayjs from 'dayjs';
import {CustomerApiService, CustomerData, Gender} from './customer-api.service';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {TafelToastrService} from '../common/components/tafel-toastr/tafel-toastr.service';

describe('CustomerApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CustomerApiService;

  const birthDate = dayjs().subtract(30, 'years').startOf('day').toDate();
  const childBirthDate = dayjs().subtract(5, 'years').startOf('day').toDate();
  const incomeDue = dayjs().add(1, 'years').startOf('day').toDate();

  /** The flat shape the rest of the application works with. */
  const mockCustomer: CustomerData = {
    id: 133,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: birthDate,
    gender: Gender.MALE,
    country: {id: 1, code: 'AT', name: 'Österreich'},
    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },
    telephoneNumber: '00436644123123123',
    email: 'max.mustermann@gmail.com',
    employer: 'test employer',
    income: 1000,
    incomeDue: incomeDue,
    singleParent: true,
    additionalPersons: [
      {
        key: 'form-only-key',
        id: 2,
        lastname: 'Mustermann',
        firstname: 'Kind',
        birthDate: childBirthDate,
        gender: Gender.FEMALE,
        country: {id: 1, code: 'AT', name: 'Österreich'},
        employer: 'test employer 2',
        income: 50,
        incomeDue: incomeDue,
        excludeFromHousehold: false,
        receivesFamilyAllowance: true
      }
    ]
  };

  /** The households/persons shape the backend actually speaks. */
  const mockHousehold = {
    id: 133,
    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },
    telephoneNumber: '00436644123123123',
    email: 'max.mustermann@gmail.com',
    singleParent: true,
    persons: [
      {
        id: 1,
        isMainPerson: true,
        lastname: 'Mustermann',
        firstname: 'Max',
        birthDate: birthDate,
        gender: Gender.MALE,
        country: {id: 1, code: 'AT', name: 'Österreich'},
        employer: 'test employer',
        income: 1000,
        incomeDue: incomeDue,
        excludeFromHousehold: false,
        receivesFamilyAllowance: false
      },
      {
        id: 2,
        isMainPerson: false,
        lastname: 'Mustermann',
        firstname: 'Kind',
        birthDate: childBirthDate,
        gender: Gender.FEMALE,
        country: {id: 1, code: 'AT', name: 'Österreich'},
        employer: 'test employer 2',
        income: 50,
        incomeDue: incomeDue,
        excludeFromHousehold: false,
        receivesFamilyAllowance: true
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        CustomerApiService,
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
          }
        },
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CustomerApiService);
  });

  it('validate customer', () => {
    apiService.validate(mockCustomer).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/households/validate'});
    expect(req.request.body.persons[0].isMainPerson).toBe(true);
    req.flush(null);
    httpMock.verify();
  });

  it('income quick-check sends the persons as-is', () => {
    const birthDate = new Date(1990, 0, 1);
    apiService.quickCheck([
      {birthDate, income: 1200, receivesFamilyAllowance: false},
      {birthDate, income: undefined, receivesFamilyAllowance: true}
    ]).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/households/income-quickcheck'});
    expect(req.request.body.persons).toHaveLength(2);
    expect(req.request.body.persons[0].income).toBe(1200);
    expect(req.request.body.persons[1].receivesFamilyAllowance).toBe(true);
    req.flush(null);
    httpMock.verify();
  });

  it('create customer', () => {
    apiService.createCustomer(mockCustomer, false).subscribe(response => {
      expect(response.data.lastname).toEqual('Mustermann');
      expect(response.data.additionalPersons).toHaveLength(1);
      expect(response.errorMsg).toBeNull();
    });

    const req = httpMock.expectOne({method: 'POST', url: '/households?force=false'});
    req.flush({data: mockHousehold, errorMsg: null});
    httpMock.verify();
  });

  it('update customer', () => {
    apiService.updateCustomer(mockCustomer, false).subscribe(response => {
      expect(response.data.id).toEqual(133);
      expect(response.errorMsg).toBeNull();
    });

    const req = httpMock.expectOne({method: 'PUT', url: '/households/133?force=false'});
    req.flush({data: mockHousehold, errorMsg: null});
    httpMock.verify();
  });

  it('update customer forced', () => {
    apiService.updateCustomer(mockCustomer, true).subscribe(response => {
      expect(response.data.id).toEqual(133);
    });

    const req = httpMock.expectOne({method: 'PUT', url: '/households/133?force=true'});
    req.flush({data: mockHousehold, errorMsg: null});
    httpMock.verify();
  });

  it('request maps the flat customer onto a household with a persons list', () => {
    apiService.updateCustomer(mockCustomer, false).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/households/133?force=false'});
    const body = req.request.body;

    // household-level fields
    expect(body.id).toEqual(133);
    expect(body.address).toEqual(mockCustomer.address);
    expect(body.telephoneNumber).toEqual('00436644123123123');
    expect(body.email).toEqual('max.mustermann@gmail.com');
    expect(body.singleParent).toBe(true);
    expect(body.firstname).toBeUndefined();
    expect(body.additionalPersons).toBeUndefined();

    // the flat main-person fields became the first persons entry
    expect(body.persons).toHaveLength(2);
    expect(body.persons[0]).toEqual({
      isMainPerson: true,
      firstname: 'Max',
      lastname: 'Mustermann',
      birthDate: birthDate,
      gender: Gender.MALE,
      country: {id: 1, code: 'AT', name: 'Österreich'},
      employer: 'test employer',
      income: 1000,
      incomeDue: incomeDue,
      excludeFromHousehold: false,
      receivesFamilyAllowance: false
    });

    // additional persons keep their id so the backend can update the existing rows
    expect(body.persons[1].id).toEqual(2);
    expect(body.persons[1].isMainPerson).toBe(false);
    expect(body.persons[1].firstname).toEqual('Kind');
    expect(body.persons[1].receivesFamilyAllowance).toBe(true);
    // the form-only `key` is not sent to the backend
    expect(body.persons[1].key).toBeUndefined();

    req.flush({data: mockHousehold, errorMsg: null});
    httpMock.verify();
  });

  it('response maps the household main person back onto the flat customer', () => {
    let result: CustomerData | undefined;
    apiService.getCustomer(133).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'GET', url: '/households/133'});
    req.flush(mockHousehold);
    httpMock.verify();

    expect(result!.id).toEqual(133);
    expect(result!.firstname).toEqual('Max');
    expect(result!.lastname).toEqual('Mustermann');
    expect(result!.birthDate).toEqual(birthDate);
    expect(result!.gender).toEqual(Gender.MALE);
    expect(result!.country).toEqual({id: 1, code: 'AT', name: 'Österreich'});
    expect(result!.employer).toEqual('test employer');
    expect(result!.income).toEqual(1000);
    expect(result!.incomeDue).toEqual(incomeDue);
    expect(result!.address).toEqual(mockCustomer.address);
    expect(result!.telephoneNumber).toEqual('00436644123123123');
    expect(result!.singleParent).toBe(true);

    expect(result!.additionalPersons).toHaveLength(1);
    expect(result!.additionalPersons![0].id).toEqual(2);
    expect(result!.additionalPersons![0].firstname).toEqual('Kind');
    expect(result!.additionalPersons![0].receivesFamilyAllowance).toBe(true);
    // the main person must not leak into the additional persons list
    expect(result!.additionalPersons!.map(person => person.firstname)).not.toContain('Max');
  });

  it('get customer', () => {
    apiService.getCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/1'});
    req.flush(null);
    httpMock.verify();
  });

  it('generate masterdata pdf', () => {
    apiService.generatePdf(1, 'MASTERDATA').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/1/generate-pdf?type=MASTERDATA'});
    req.flush(null);
    httpMock.verify();
  });

  it('generate idcard pdf', () => {
    apiService.generatePdf(1, 'IDCARD').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/1/generate-pdf?type=IDCARD'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with a search input and a filter', () => {
    apiService.searchCustomer('mustermann', null, null, true).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?searchInput=mustermann&valid=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer maps every result item', () => {
    let result;
    apiService.searchCustomer('mustermann').subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'GET', url: '/households?searchInput=mustermann'});
    req.flush({items: [mockHousehold], totalCount: 1, currentPage: 1, totalPages: 1, pageSize: 25});
    httpMock.verify();

    expect(result!.totalCount).toEqual(1);
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].lastname).toEqual('Mustermann');
    expect(result!.items[0].additionalPersons).toHaveLength(1);
  });

  it('search customer with a search input only', () => {
    apiService.searchCustomer('mustermann').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?searchInput=mustermann'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including postProcessing parameter', () => {
    apiService.searchCustomer(null, true, null).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?postProcessing=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including costContribution parameter', () => {
    apiService.searchCustomer(null, null, true).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?costContribution=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including valid parameter', () => {
    apiService.searchCustomer(null, null, null, true).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?valid=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including locked parameter', () => {
    apiService.searchCustomer(null, null, null, null, true).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?locked=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('search customer including page parameter', () => {
    apiService.searchCustomer('max', null, null, null, null, 3).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households?searchInput=max&page=3'});
    req.flush(null);
    httpMock.verify();
  });

  it('delete customer', () => {
    apiService.deleteCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/households/1'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customer duplicates without page', () => {
    apiService.getCustomerDuplicates().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/duplicates'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customer duplicates with page', () => {
    apiService.getCustomerDuplicates(3).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/duplicates?page=3'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customer duplicates maps household/similarHouseholds to customer/similarCustomers', () => {
    let result;
    apiService.getCustomerDuplicates(1).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'GET', url: '/households/duplicates?page=1'});
    req.flush({
      items: [{household: mockHousehold, similarHouseholds: [mockHousehold]}],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      pageSize: 1
    });
    httpMock.verify();

    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].customer.lastname).toEqual('Mustermann');
    expect(result!.items[0].similarCustomers).toHaveLength(1);
    expect(result!.items[0].similarCustomers[0].id).toEqual(133);
  });

  it('get customers above limit without page', () => {
    apiService.getCustomersAboveLimit().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/above-limit'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customers above limit with page', () => {
    apiService.getCustomersAboveLimit(3).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/above-limit?page=3'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customers above limit with sort', () => {
    apiService.getCustomersAboveLimit(1, 25, 'totalSum', 'asc').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/above-limit?page=1&pageSize=25&sortBy=totalSum&sortDirection=asc'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customers above limit maps household to customer', () => {
    let result;
    apiService.getCustomersAboveLimit(1).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'GET', url: '/households/above-limit?page=1'});
    req.flush({
      items: [{household: mockHousehold, totalSum: 1500, limit: 1000, amountExceededLimit: 500, percentageExceededLimit: 50}],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      pageSize: 25
    });
    httpMock.verify();

    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].customer.lastname).toEqual('Mustermann');
    expect(result!.items[0].totalSum).toEqual(1500);
    expect(result!.items[0].limit).toEqual(1000);
    expect(result!.items[0].amountExceededLimit).toEqual(500);
    expect(result!.items[0].percentageExceededLimit).toEqual(50);
    expect(result!.totalCount).toEqual(1);
  });

  it('generate customers above limit csv', () => {
    apiService.generateCustomersAboveLimitCsv('amountExceededLimit', 'desc').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/above-limit/csv?sortBy=amountExceededLimit&sortDirection=desc'});
    expect(req.request.responseType).toEqual('blob');
    req.flush(new Blob());
    httpMock.verify();
  });

  it('get customers overview without distributionId', () => {
    apiService.getCustomersOverview().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/overview'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customers overview with distributionId', () => {
    apiService.getCustomersOverview(100).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/overview?distributionId=100'});
    req.flush(null);
    httpMock.verify();
  });

  it('get customers overview maps new and renewed households to customers', () => {
    let result;
    apiService.getCustomersOverview(100).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'GET', url: '/households/overview?distributionId=100'});
    req.flush({
      distributionId: 100,
      distributionStartedAt: '2026-01-01T08:00:00',
      distributionEndedAt: '2026-01-01T18:00:00',
      newHouseholds: [{household: mockHousehold, date: '2026-01-01T09:00:00'}],
      renewedHouseholds: [],
    });
    httpMock.verify();

    expect(result!.distributionId).toEqual(100);
    expect(result!.newCustomers).toHaveLength(1);
    expect(result!.newCustomers[0].customer.lastname).toEqual('Mustermann');
    expect(result!.newCustomers[0].date).toEqual('2026-01-01T09:00:00');
    expect(result!.renewedCustomers).toHaveLength(0);
  });

  it('merge customers without field selections', () => {
    const targetCustomerId = 123;
    const sourceCustomerIds = [456, 789];
    let result;
    apiService.mergeCustomers(targetCustomerId, sourceCustomerIds).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'POST', url: `/households/${targetCustomerId}/merge`});
    expect(req.request.body).toEqual({sourceHouseholdIds: sourceCustomerIds, fieldSelections: []});

    req.flush({
      target: mockHousehold,
      movedPersonCount: 1,
      droppedDuplicatePersonCount: 0,
      movedNoteCount: 2,
      movedDocumentCount: 0,
      movedDistributionCount: 0,
      droppedDistributionCount: 0,
      deletedHouseholdIds: sourceCustomerIds
    });
    httpMock.verify();

    expect(result!.target.lastname).toEqual('Mustermann');
    expect(result!.movedPersonCount).toEqual(1);
    expect(result!.movedNoteCount).toEqual(2);
    expect(result!.deletedCustomerIds).toEqual(sourceCustomerIds);
  });

  it('merge customers with field selections maps sourceCustomerId to sourceHouseholdId', () => {
    const targetCustomerId = 123;
    const sourceCustomerIds = [456];
    apiService.mergeCustomers(targetCustomerId, sourceCustomerIds, [
      {field: 'TELEPHONE_NUMBER', sourceCustomerId: 456},
      {field: 'EMAIL'}
    ]).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/households/${targetCustomerId}/merge`});
    expect(req.request.body).toEqual({
      sourceHouseholdIds: sourceCustomerIds,
      fieldSelections: [
        {field: 'TELEPHONE_NUMBER', sourceHouseholdId: 456},
        {field: 'EMAIL', sourceHouseholdId: null}
      ]
    });

    req.flush({
      target: mockHousehold,
      movedPersonCount: 0,
      droppedDuplicatePersonCount: 0,
      movedNoteCount: 0,
      movedDocumentCount: 0,
      movedDistributionCount: 0,
      droppedDistributionCount: 0,
      deletedHouseholdIds: sourceCustomerIds
    });
    httpMock.verify();
  });

  it('get merge preview maps household target/sources/persons to customer shape', () => {
    const targetCustomerId = 123;
    const sourceCustomerIds = [456];
    let result;
    apiService.getMergePreview(targetCustomerId, sourceCustomerIds).subscribe(response => result = response);

    const req = httpMock.expectOne(
      req => req.method === 'GET' && req.url === `/households/${targetCustomerId}/merge-preview`
    );
    expect(req.request.params.getAll('sourceHouseholdIds')).toEqual(['456']);

    req.flush({
      target: mockHousehold,
      sources: [mockHousehold],
      fieldConflicts: [{field: 'TELEPHONE_NUMBER', conflictingSourceHouseholdIds: [456]}],
      persons: [{sourceHouseholdId: 456, person: mockHousehold.persons[0], duplicate: false}],
      distributionCollisions: [],
      noteCount: 1,
      documentCount: 0
    });
    httpMock.verify();

    expect(result!.target.lastname).toEqual('Mustermann');
    expect(result!.sources).toHaveLength(1);
    expect(result!.fieldConflicts).toEqual([{field: 'TELEPHONE_NUMBER', conflictingSourceCustomerIds: [456]}]);
    expect(result!.persons[0].sourceCustomerId).toEqual(456);
    expect(result!.persons[0].person.lastname).toEqual('Mustermann');
    expect(result!.noteCount).toEqual(1);
  });

  it('pay cost contribution with an amount', () => {
    apiService.payCostContribution(133, 4).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/households/133/cost-contribution/pay'});
    expect(req.request.body).toEqual({amount: 4});

    req.flush(mockHousehold);
    httpMock.verify();
  });

  it('pay cost contribution without an amount maps the response to a customer', () => {
    let result: CustomerData | undefined;
    apiService.payCostContribution(133).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'POST', url: '/households/133/cost-contribution/pay'});
    expect(req.request.body).toEqual({amount: undefined});

    req.flush(mockHousehold);
    httpMock.verify();

    expect(result?.id).toEqual(mockCustomer.id);
    expect(result?.lastname).toEqual(mockCustomer.lastname);
    expect(result?.firstname).toEqual(mockCustomer.firstname);
  });

  it('edit cost contribution sends the new amount and maps the response to a customer', () => {
    let result: CustomerData | undefined;
    apiService.editCostContribution(133, 42).subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'PUT', url: '/households/133/cost-contribution'});
    expect(req.request.body).toEqual({amount: 42});

    req.flush(mockHousehold);
    httpMock.verify();

    expect(result?.id).toEqual(mockCustomer.id);
    expect(result?.lastname).toEqual(mockCustomer.lastname);
    expect(result?.firstname).toEqual(mockCustomer.firstname);
  });

});
