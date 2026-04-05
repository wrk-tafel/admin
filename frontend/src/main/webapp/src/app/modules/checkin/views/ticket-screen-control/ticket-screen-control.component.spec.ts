import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenControlComponent} from './ticket-screen-control.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {DistributionTicketScreenApiService} from '../../../../api/distribution-ticket-screen-api.service';
import {of, throwError} from 'rxjs';
import {ToastrService} from 'ngx-toastr';

describe('TicketScreenControlComponent', () => {
  let distributionTicketScreenApiService: MockedObject<DistributionTicketScreenApiService>;
  let urlHelperSpy: MockedObject<UrlHelperService>;
  let toastr: MockedObject<ToastrService>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: DistributionTicketScreenApiService,
          useValue: {
            showText: vi.fn().mockName("DistributionTicketScreenApiService.showText"),
            showCurrentTicket: vi.fn().mockName("DistributionTicketScreenApiService.showCurrentTicket"),
            showPreviousTicket: vi.fn().mockName("DistributionTicketScreenApiService.showPreviousTicket"),
            showNextTicket: vi.fn().mockName("DistributionTicketScreenApiService.showNextTicket")
          }
        },
        {
          provide: UrlHelperService,
          useValue: {
            getBaseUrl: vi.fn().mockName("UrlHelperService.getBaseUrl")
          }
        },
        {
          provide: ToastrService,
          useValue: {
            error: vi.fn().mockName("ToastrService.error"),
            info: vi.fn().mockName("ToastrService.info"),
            success: vi.fn().mockName("ToastrService.success"),
            warning: vi.fn().mockName("ToastrService.warning")
          }
        }
      ]
    }).compileComponents();

    distributionTicketScreenApiService = TestBed.inject(DistributionTicketScreenApiService) as MockedObject<DistributionTicketScreenApiService>;
    urlHelperSpy = TestBed.inject(UrlHelperService) as MockedObject<UrlHelperService>;
    toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
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
    urlHelperSpy.getBaseUrl.mockReturnValue(testBaseUrl);
    vi.spyOn(window, 'open');

    component.openScreenInNewTab();

    expect(window.open).toHaveBeenCalledWith(`${testBaseUrl}/#/anmeldung/ticketmonitor`, '_blank');
  });

  it('showStartTime', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.mockReturnValue(of(null));

    const startTime = '19:00';
    component.startTimeFormModel.set({
      startTime: startTime
    });

    component.showStartTime();

    expect(distributionTicketScreenApiService.showText).toHaveBeenCalledWith('Startzeit', startTime);
  });

  it('showCurrentTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(of(null));

    component.showCurrentTicket();

    expect(distributionTicketScreenApiService.showCurrentTicket).toHaveBeenCalled();
  });

  it('showPreviousTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(of(null));

    component.showPreviousTicket();

    expect(distributionTicketScreenApiService.showPreviousTicket).toHaveBeenCalled();
  });

  it('showNextTicket with costContributionPaid true', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(null));

    component.showNextTicket(true);

    expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(true);
  });

  it('showNextTicket with costContributionPaid false', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(null));

    component.showNextTicket(false);

    expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(false);
  });

  it('showStartTime handles errors and shows toast', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.mockReturnValue(throwError(() => new Error('API Error')));

    const startTime = '19:00';
    component.startTimeFormModel.set({
      startTime: startTime
    });

    component.showStartTime();

    expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen der Startzeit!');
  });

  it('showCurrentTicket handles errors and shows toast', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(throwError(() => new Error('API Error')));

    component.showCurrentTicket();

    expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen des aktuellen Tickets!');
  });

  it('showNextTicket handles errors and shows toast', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(throwError(() => new Error('API Error')));

    component.showNextTicket(false);

    expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen des nächsten Tickets!');
  });

  it('showStartTime manages loading state correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.mockReturnValue(of(null));

    const startTime = '19:00';
    component.startTimeFormModel.set({
      startTime: startTime
    });

    expect(component.isShowingStartTime()).toBe(false);
    component.showStartTime();
    expect(component.isShowingStartTime()).toBe(false); // finalize resets it
  });

  it('showCurrentTicket manages loading state correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(of(null));

    expect(component.isShowingCurrentTicket()).toBe(false);
    component.showCurrentTicket();
    expect(component.isShowingCurrentTicket()).toBe(false); // finalize resets it
  });

  it('showNextTicket manages loading state correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(null));

    expect(component.isShowingNextTicket()).toBe(false);
    component.showNextTicket(false);
    expect(component.isShowingNextTicket()).toBe(false); // finalize resets it
  });

});
