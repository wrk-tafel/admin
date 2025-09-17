import {TestBed} from '@angular/core/testing';
import {RegisteredCustomersComponent} from './registered-customers.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {HttpHeaders, HttpResponse, provideHttpClient} from '@angular/common/http';
import {of, BehaviorSubject} from 'rxjs';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideZonelessChangeDetection} from "@angular/core";
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {DistributionItem} from '../../../../api/distribution-api.service';

describe('RegisteredCustomersComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let fileHelperService: jasmine.SpyObj<FileHelperService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['downloadCustomerList'])
        },
        {
          provide: FileHelperService,
          useValue: jasmine.createSpyObj('FileHelperService', ['downloadFile'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as jasmine.SpyObj<FileHelperService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    
    // Setup mock for GlobalStateService
    const mockDistribution: DistributionItem = {
      id: 123,
      name: 'Test Distribution'
    } as DistributionItem;
    const mockBehaviorSubject = new BehaviorSubject<DistributionItem>(mockDistribution);
    globalStateService.getCurrentDistribution.and.returnValue(mockBehaviorSubject);
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('customers count rendered', async () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const componentRef = fixture.componentRef;

    const count = 123;
    componentRef.setInput('count', count);

    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('[testid="customers-count"]')).nativeElement.textContent).toBe(`${count}`);
  });

  it('download customers list', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;

    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-1.pdf'}
      ),
      body: new Blob()
    });
    distributionApiService.downloadCustomerList.and.returnValue(of(response));

    component.downloadCustomerList();

    expect(distributionApiService.downloadCustomerList).toHaveBeenCalled();
    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-1.pdf', response.body);
  });

});
