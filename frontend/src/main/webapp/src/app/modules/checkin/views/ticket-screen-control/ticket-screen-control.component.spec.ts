import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TicketScreenControlComponent } from './ticket-screen-control.component';
import { UrlHelperService } from '../../../../common/util/url-helper.service';
import { DistributionTicketScreenApiService } from '../../../../api/distribution-ticket-screen-api.service';
import { of } from 'rxjs';

describe('TicketScreenControlComponent', () => {
    let distributionTicketScreenApiService: MockedObject<DistributionTicketScreenApiService>;
    let urlHelperSpy: MockedObject<UrlHelperService>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [CommonModule],
            providers: [
                {
                    provide: DistributionTicketScreenApiService,
                    useValue: {
                        showText: vi.fn().mockName("DistributionTicketScreenApiService.showText"),
                        showCurrentTicket: vi.fn().mockName("DistributionTicketScreenApiService.showCurrentTicket"),
                        showNextTicket: vi.fn().mockName("DistributionTicketScreenApiService.showNextTicket")
                    }
                },
                {
                    provide: UrlHelperService,
                    useValue: {
                        getBaseUrl: vi.fn().mockName("UrlHelperService.getBaseUrl")
                    }
                }
            ]
        }).compileComponents();

        distributionTicketScreenApiService = TestBed.inject(DistributionTicketScreenApiService) as MockedObject<DistributionTicketScreenApiService>;
        urlHelperSpy = TestBed.inject(UrlHelperService) as MockedObject<UrlHelperService>;
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
        component.form.get('startTime').setValue(startTime);

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

    it('showNextTicket', () => {
        const fixture = TestBed.createComponent(TicketScreenControlComponent);
        const component = fixture.componentInstance;
        distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(null));

        component.showNextTicket();

        expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalled();
    });

});
