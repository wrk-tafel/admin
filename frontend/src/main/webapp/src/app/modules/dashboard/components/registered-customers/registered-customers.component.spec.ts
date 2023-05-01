import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {RegisteredCustomersComponent} from './registered-customers.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {DistributionApiService} from "../../../../api/distribution-api.service";
import {EMPTY} from "rxjs";

describe('RegisteredCustomersComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      declarations: [
        RegisteredCustomersComponent
      ],
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['downloadCustomerList'])
        },
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('customers count rendered', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;

    const count = 123;
    component.count = count;

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="customers-count"]')).nativeElement.textContent).toBe(`${count}`);
  });

  it('download customers list', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    distributionApiService.downloadCustomerList.and.returnValue(EMPTY);

    component.downloadCustomerList();

    expect(distributionApiService.downloadCustomerList).toHaveBeenCalled();
  });

});
