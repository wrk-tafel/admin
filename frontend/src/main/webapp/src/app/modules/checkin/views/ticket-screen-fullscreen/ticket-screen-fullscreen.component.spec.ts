import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TicketScreenFullscreenComponent } from './ticket-screen-fullscreen.component';
import { SseService } from '../../../../common/sse/sse.service';

describe('TicketScreenFullscreenComponent', () => {

    interface SetupOptions {
        queryParams?: Record<string, string>;
        requestFullscreen?: ReturnType<typeof vi.fn>;
        wakeLockSupported?: boolean;
        wakeLockRelease?: ReturnType<typeof vi.fn>;
    }

    // jsdom doesn't implement the Fullscreen API, so `document`/`document.documentElement` need
    // these redefined as writable own properties before each test - real DOCUMENT/document.body
    // stay in place (unlike a plain useValue override) since Angular's renderer needs a real
    // Document to attach the fixture's host element to.
    function setup(options: SetupOptions = {}) {
        const requestFullscreen = options.requestFullscreen ?? vi.fn().mockImplementation(async () => {
            Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true, writable: true });
        });
        Object.defineProperty(
            document.documentElement, 'requestFullscreen', { value: requestFullscreen, configurable: true, writable: true }
        );
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true, writable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true, writable: true });

        const wakeLockRelease = options.wakeLockRelease ?? vi.fn().mockResolvedValue(undefined);
        const wakeLockRequest = vi.fn().mockResolvedValue({ release: wakeLockRelease });
        const windowSpy = {
            navigator: options.wakeLockSupported === false ? {} : { wakeLock: { request: wakeLockRequest } }
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: SseService, useValue: { listen: vi.fn().mockReturnValue(of({})) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(options.queryParams ?? {}) } } },
                { provide: Window, useValue: windowSpy }
            ]
        });

        const fixture: ComponentFixture<TicketScreenFullscreenComponent> = TestBed.createComponent(TicketScreenFullscreenComponent);
        fixture.detectChanges();

        return {
            fixture,
            component: fixture.componentInstance,
            requestFullscreen,
            wakeLockRequest,
            wakeLockRelease
        };
    }

    afterEach(() => {
        delete (document.documentElement as unknown as { requestFullscreen?: unknown }).requestFullscreen;
        delete (document as unknown as { fullscreenElement?: unknown }).fullscreenElement;
        delete (document as unknown as { visibilityState?: unknown }).visibilityState;
    });

    it('component can be created', () => {
        const { component } = setup();
        expect(component).toBeTruthy();
    });

    it('requests a screen wake lock on init', async () => {
        const { fixture, wakeLockRequest } = setup();
        await fixture.whenStable();

        expect(wakeLockRequest).toHaveBeenCalledWith('screen');
    });

    it('does not throw when the Wake Lock API is unavailable', async () => {
        const { fixture, component } = setup({ wakeLockSupported: false });
        await fixture.whenStable();

        expect(component).toBeTruthy();
    });

    it('re-acquires the wake lock once the tab becomes visible again', async () => {
        const { fixture, wakeLockRequest } = setup();
        await fixture.whenStable();
        wakeLockRequest.mockClear();

        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        await fixture.whenStable();
        expect(wakeLockRequest).not.toHaveBeenCalled();

        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        await fixture.whenStable();
        expect(wakeLockRequest).toHaveBeenCalledWith('screen');
    });

    it('enters fullscreen and hides the button once it succeeds', async () => {
        const { fixture, component, requestFullscreen } = setup();
        await fixture.whenStable();
        expect(component.showFullscreenButton()).toBe(true);

        await component.enterFullscreen();

        expect(requestFullscreen).toHaveBeenCalled();
        expect(component.showFullscreenButton()).toBe(false);
    });

    it('leaves the button visible when entering fullscreen is rejected', async () => {
        const { fixture, component } = setup({
            requestFullscreen: vi.fn().mockRejectedValue(new Error('denied'))
        });
        await fixture.whenStable();

        await component.enterFullscreen();

        expect(component.showFullscreenButton()).toBe(true);
    });

    it('shows the fullscreen button again once fullscreen is exited', async () => {
        const { fixture, component } = setup();
        await fixture.whenStable();
        await component.enterFullscreen();
        expect(component.showFullscreenButton()).toBe(false);

        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true, writable: true });
        document.dispatchEvent(new Event('fullscreenchange'));

        expect(component.showFullscreenButton()).toBe(true);
    });

    it('reads the sound query param to enable the chime', () => {
        const { component } = setup({ queryParams: { sound: '1' } });
        expect(component.soundEnabled).toBe(true);
    });

    it('defaults the chime to disabled without the sound query param', () => {
        const { component } = setup();
        expect(component.soundEnabled).toBe(false);
    });

    it('releases the wake lock on destroy', async () => {
        const wakeLockRelease = vi.fn().mockResolvedValue(undefined);
        const { fixture } = setup({ wakeLockRelease });
        await fixture.whenStable();

        fixture.destroy();
        await Promise.resolve();

        expect(wakeLockRelease).toHaveBeenCalled();
    });

});
