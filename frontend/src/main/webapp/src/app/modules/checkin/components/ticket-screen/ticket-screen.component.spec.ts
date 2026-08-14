import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TicketScreenComponent, TicketScreenText } from './ticket-screen.component';
import { of, Subject } from 'rxjs';
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

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    function createFixture(soundEnabled = false): ComponentFixture<TicketScreenComponent> {
        const fixture = TestBed.createComponent(TicketScreenComponent);
        fixture.componentRef.setInput('soundEnabled', soundEnabled);
        return fixture;
    }

    it('component can be created', () => {
        sseService.listen.mockReturnValue(of({} as TicketScreenText));

        const fixture = createFixture();
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('data change fills states correctly', () => {
        const testData: TicketScreenText = { text: 'Test Text', value: 'Test Value' };
        sseService.listen.mockReturnValue(of(testData));

        const fixture = createFixture();
        const component = fixture.componentInstance;

        expect(sseService.listen).toHaveBeenCalledWith('/sse/distributions/ticket-screen/current', expect.any(Function));
        expect(component.text()).toBe(testData.text);
        expect(component.value()).toBe(testData.value);
    });

    it('connected reflects the connection-state callback passed to SseService', () => {
        sseService.listen.mockReturnValue(of({} as TicketScreenText));

        const fixture = createFixture();
        const component = fixture.componentInstance;

        expect(component.connected()).toBe(true);

        const connectionStateCallback = sseService.listen.mock.calls[0][1] as (connected: boolean) => void;
        connectionStateCallback(false);
        expect(component.connected()).toBe(false);

        connectionStateCallback(true);
        expect(component.connected()).toBe(true);
    });

    it('stamps lastUpdateAt on every message, including an unchanged resend after a reconnect', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-13T10:00:00'));
        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture();
        const component = fixture.componentInstance;

        data.next({ text: 'Ticket', value: '3' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.lastUpdateAt()).toEqual(new Date('2026-08-13T10:00:00'));

        // A fresh SSE connection (e.g. after a reconnect) resends the current state even when
        // nothing actually changed - the display must still learn that the state was reconfirmed.
        vi.setSystemTime(new Date('2026-08-13T10:05:00'));
        data.next({ text: 'Ticket', value: '3' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.lastUpdateAt()).toEqual(new Date('2026-08-13T10:05:00'));
    });

    it('shows the previously called ticket number once it changes, but not on the first message', async () => {
        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture();
        const component = fixture.componentInstance;

        data.next({ text: 'Ticket', value: '1' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.previousTicketValue()).toBeNull();

        data.next({ text: 'Ticket', value: '2' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.previousTicketValue()).toBe('1');

        data.next({ text: 'Ticket', value: '3' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.previousTicketValue()).toBe('2');
    });

    it('clears the previous-ticket caption once the display switches away from a ticket number', async () => {
        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture();
        const component = fixture.componentInstance;

        data.next({ text: 'Ticket', value: '1' });
        fixture.detectChanges();
        await fixture.whenStable();
        data.next({ text: 'Ticket', value: '2' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.previousTicketValue()).toBe('1');

        data.next({ text: 'Startzeit', value: '09:00' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.previousTicketValue()).toBeNull();

        // Switching back to tickets starts tracking fresh rather than resurrecting the stale
        // number from before the "Startzeit" announcement.
        data.next({ text: 'Ticket', value: '5' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.previousTicketValue()).toBeNull();
    });

    it('briefly toggles justChanged to drive the change animation when the ticket number changes', async () => {
        vi.useFakeTimers();
        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture();
        const component = fixture.componentInstance;

        data.next({ text: 'Ticket', value: '1' });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.justChanged()).toBe(false);

        data.next({ text: 'Ticket', value: '2' });
        fixture.detectChanges();
        await fixture.whenStable();

        vi.advanceTimersByTime(0);
        expect(component.justChanged()).toBe(true);

        vi.advanceTimersByTime(700);
        expect(component.justChanged()).toBe(false);
    });

    it('does not play a chime by default', async () => {
        const audioContextSpy = vi.fn();
        vi.stubGlobal('AudioContext', audioContextSpy);
        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture(false);

        data.next({ text: 'Ticket', value: '1' });
        fixture.detectChanges();
        await fixture.whenStable();
        data.next({ text: 'Ticket', value: '2' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(audioContextSpy).not.toHaveBeenCalled();
    });

    it('plays a chime on a ticket-number change when soundEnabled is set', async () => {
        const oscillator = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
        const audioContextInstance = {
            currentTime: 0,
            createOscillator: vi.fn().mockReturnValue(oscillator),
            createGain: vi.fn().mockReturnValue(gain),
            close: vi.fn().mockResolvedValue(undefined)
        };
        // A plain arrow-function mock can't back `new AudioContext()` (not newable), so this needs
        // an actual function expression.
        const audioContextSpy = vi.fn(function AudioContextMock() {
            return audioContextInstance;
        });
        vi.stubGlobal('AudioContext', audioContextSpy);

        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture(true);

        data.next({ text: 'Ticket', value: '1' });
        fixture.detectChanges();
        await fixture.whenStable();
        data.next({ text: 'Ticket', value: '2' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(audioContextSpy).toHaveBeenCalledTimes(1);
        expect(oscillator.start).toHaveBeenCalled();
    });

    it('does not play a chime for a "Startzeit" change even when soundEnabled is set', async () => {
        const audioContextSpy = vi.fn();
        vi.stubGlobal('AudioContext', audioContextSpy);
        const data = new Subject<TicketScreenText>();
        sseService.listen.mockReturnValue(data.asObservable());

        const fixture = createFixture(true);

        data.next({ text: 'Startzeit', value: '09:00' });
        fixture.detectChanges();
        await fixture.whenStable();
        data.next({ text: 'Startzeit', value: '09:30' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(audioContextSpy).not.toHaveBeenCalled();
    });

});
