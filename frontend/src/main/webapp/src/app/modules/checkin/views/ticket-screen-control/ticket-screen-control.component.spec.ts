import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenControlComponent} from './ticket-screen-control.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {DistributionTicketScreenApiService} from '../../../../api/distribution-ticket-screen-api.service';
import {of} from 'rxjs';

describe('TicketScreenControlComponent', () => {
  let distributionTicketScreenApiService: jasmine.SpyObj<DistributionTicketScreenApiService>;
  let urlHelperSpy: jasmine.SpyObj<UrlHelperService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: DistributionTicketScreenApiService,
          useValue: jasmine.createSpyObj('DistributionTicketScreenApiService', ['showText', 'showCurrentTicket', 'showNextTicket'])
        },
        {
          provide: UrlHelperService,
          useValue: jasmine.createSpyObj('UrlHelperService', ['getBaseUrl'])
        }
      ]
    }).compileComponents();

    distributionTicketScreenApiService = TestBed.inject(DistributionTicketScreenApiService) as jasmine.SpyObj<DistributionTicketScreenApiService>;
    urlHelperSpy = TestBed.inject(UrlHelperService) as jasmine.SpyObj<UrlHelperService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('openScreenInNewTab', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;

    const testBaseUrl = 'http://test:1234/testcontext';
    urlHelperSpy.getBaseUrl.and.returnValue(testBaseUrl);
    spyOn(window, 'open');

    component.openScreenInNewTab();

    expect(window.open).toHaveBeenCalledWith(`${testBaseUrl}/#/anmeldung/ticketmonitor`, '_blank');
  });

  it('showStartTime', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.and.returnValue(of(null));

    const startTime = '19:00';
    component.form.get('startTime').setValue(startTime);

    component.showStartTime();

    expect(distributionTicketScreenApiService.showText).toHaveBeenCalledWith('Startzeit', startTime);
  });

  it('showCurrentTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.and.returnValue(of(null));

    component.showCurrentTicket();

    expect(distributionTicketScreenApiService.showCurrentTicket).toHaveBeenCalled();
  });

  it('showNextTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.and.returnValue(of(null));

    component.showNextTicket();

    expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalled();
  });

});
