import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {RegisteredCustomersComponent} from './registered-customers.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';

describe('RegisteredCustomersComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let fileHelperService: jasmine.SpyObj<FileHelperService>;

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
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['downloadCustomerList'])
        },
        {
          provide: FileHelperService,
          useValue: jasmine.createSpyObj('FileHelperService', ['downloadFile'])
        },
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as jasmine.SpyObj<FileHelperService>;
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
