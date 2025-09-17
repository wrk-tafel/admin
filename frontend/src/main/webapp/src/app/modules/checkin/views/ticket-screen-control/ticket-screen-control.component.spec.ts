import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenControlComponent} from './ticket-screen-control.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {DistributionTicketScreenApiService} from '../../../../api/distribution-ticket-screen-api.service';
import {SseService} from '../../../../common/sse/sse.service';
import {of, BehaviorSubject} from 'rxjs';
import {provideZonelessChangeDetection} from "@angular/core";

describe('TicketScreenControlComponent', () => {
  let distributionTicketScreenApiService: jasmine.SpyObj<DistributionTicketScreenApiService>;
  let urlHelperSpy: jasmine.SpyObj<UrlHelperService>;
  let sseService: jasmine.SpyObj<SseService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: DistributionTicketScreenApiService,
          useValue: jasmine.createSpyObj('DistributionTicketScreenApiService', ['showText', 'showCurrentTicket', 'showNextTicket'])
        },
        {
          provide: UrlHelperService,
          useValue: jasmine.createSpyObj('UrlHelperService', ['getBaseUrl'])
        },
        {
          provide: SseService,
          useValue: jasmine.createSpyObj('SseService', ['listen'])
        }
      ]
    }).compileComponents();

    distributionTicketScreenApiService = TestBed.inject(DistributionTicketScreenApiService) as jasmine.SpyObj<DistributionTicketScreenApiService>;
    urlHelperSpy = TestBed.inject(UrlHelperService) as jasmine.SpyObj<UrlHelperService>;
    sseService = TestBed.inject(SseService) as jasmine.SpyObj<SseService>;
    
    // Setup mock for SseService to return empty BehaviorSubject
    const mockTicketScreenText = { text: 'Test', value: 'Test Value' };
    sseService.listen.and.returnValue(new BehaviorSubject(mockTicketScreenText));
  });

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
