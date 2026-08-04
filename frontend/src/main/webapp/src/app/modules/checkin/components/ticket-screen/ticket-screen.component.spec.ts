import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TicketScreenComponent, TicketScreenText } from './ticket-screen.component';
import { of } from 'rxjs';
import { SseService } from '../../../../common/sse/sse.service';

describe('TicketScreenComponent', () => {
    let sseService: MockedObject<SseService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule],
            providers: [
                {
                    provide: SseService,
                    useValue: {
                        listen: vi.fn().mockName('SseService.listen')
                    }
                }
            ]
        }).compileComponents();

        sseService = TestBed.inject(SseService) as MockedObject<SseService>;
    });

    it('component can be created', () => {
        sseService.listen.mockReturnValue(of({} as TicketScreenText));

        const fixture = TestBed.createComponent(TicketScreenComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('data change fills states correctly', () => {
        const testData: TicketScreenText = { text: 'Test Text', value: 'Test Value' };
        sseService.listen.mockReturnValue(of(testData));

        const fixture = TestBed.createComponent(TicketScreenComponent);
        const component = fixture.componentInstance;

        expect(sseService.listen).toHaveBeenCalledWith('/sse/distributions/ticket-screen/current', expect.any(Function));
        expect(component.text()).toBe(testData.text);
        expect(component.value()).toBe(testData.value);
    });

    it('connected reflects the connection-state callback passed to SseService', () => {
        sseService.listen.mockReturnValue(of({} as TicketScreenText));

        const fixture = TestBed.createComponent(TicketScreenComponent);
        const component = fixture.componentInstance;

        expect(component.connected()).toBe(true);

        const connectionStateCallback = sseService.listen.mock.calls[0][1] as (connected: boolean) => void;
        connectionStateCallback(false);
        expect(component.connected()).toBe(false);

        connectionStateCallback(true);
        expect(component.connected()).toBe(true);
    });

});
