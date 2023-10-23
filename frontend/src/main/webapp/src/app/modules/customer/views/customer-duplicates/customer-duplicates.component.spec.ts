import {TestBed, waitForAsync} from '@angular/core/testing';
import {CustomerApiService} from '../../../../api/customer-api.service';
import {CustomerDuplicatesComponent} from './customer-duplicates.component';

describe('CustomerDuplicatesComponent', () => {
  let customerApiService: jasmine.SpyObj<CustomerApiService>;

  beforeEach(waitForAsync(() => {
    const customerApiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['generatePdf', 'deleteCustomer', 'updateCustomer']);

    TestBed.configureTestingModule({
      imports: [],
      declarations: [
        CustomerDuplicatesComponent
      ],
      providers: [
        {
          provide: CustomerApiService,
          useValue: customerApiServiceSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

});
