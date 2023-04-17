import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {ModalModule} from 'ngx-bootstrap/modal';
import {RouterTestingModule} from '@angular/router/testing';
import {RegisteredCustomersComponent} from './registered-customers.component';

describe('RegisteredCustomersComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ModalModule.forRoot()
      ],
      declarations: [
        RegisteredCustomersComponent
      ],
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', [''])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
