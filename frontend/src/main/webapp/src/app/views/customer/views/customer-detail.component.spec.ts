import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import * as moment from 'moment';
import { of } from 'rxjs';
import { FileHelperService } from '../../../common/util/file-helper.service';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';
import { CustomerDetailComponent } from './customer-detail.component';

describe('CustomerDetailComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;
  let fileHelperService: jasmine.SpyObj<FileHelperService>;

  const mockCustomer: CustomerData = {
    id: 133,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
    country: {
      id: 0,
      code: 'AT',
      name: 'Österreich'
    },
    telephoneNumber: 6644123123123,
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

    additionalPersons: [
      { lastname: 'Add', firstname: 'Pers 1', birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(), income: 50 },
      { lastname: 'Add', firstname: 'Pers 2', birthDate: moment().subtract(10, 'years').startOf('day').utc().toDate(), income: 80 }
    ]
  };

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomer', 'generateMasterdataPdf']);
    const fileHelperServiceSpy = jasmine.createSpyObj('FileHelperService', ['downloadFile']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: apiServiceSpy
        },
        {
          provide: FileHelperService,
          useValue: fileHelperServiceSpy
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: mockCustomer.id })
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as jasmine.SpyObj<FileHelperService>;
  }));

  // TODO: add tests to check data mapping from data into form fields

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('initial data loaded', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(component.customerData).toEqual(mockCustomer);
  }));

  it('printMasterdata', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        { 'Content-Disposition': 'inline; filename=test-name-1.pdf' }
      ),
      body: new ArrayBuffer(10)
    });
    apiService.generateMasterdataPdf.withArgs(mockCustomer.id).and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.printMasterdata();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', new Blob([response.body], { type: 'application/pdf' }));
  }));

});
