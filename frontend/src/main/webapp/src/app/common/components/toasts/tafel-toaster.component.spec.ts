import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { TafelToasterComponent } from './tafel-toaster.component';
import { CommonModule } from '@angular/common';
import { ToastModule } from '@coreui/angular';
import { ToastOptions, ToastOptionsWithId, ToastService, ToastType } from './toast.service';
import { TafelToastComponent } from './toast/tafel-toast.component';
import { signal } from '@angular/core';
// eslint-disable-next-line deprecation/deprecation
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('TafelToasterComponent', () => {
    let toastServiceSpy: MockedObject<ToastService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                ToastModule
            ],
            providers: [
                // Required for CoreUI components that use animations (e.g., ToastComponent with @fadeInOut)
                // Though deprecated in Angular 20.2, still needed until CoreUI migrates to CSS animations
                // eslint-disable-next-line deprecation/deprecation
                provideNoopAnimations(),
                {
                    provide: ToastService,
                    useValue: {
                        showToast: vi.fn().mockName("ToastService.showToast"),
                        getToastQueue: vi.fn().mockName("ToastService.getToastQueue")
                    }
                }
            ]
        }).compileComponents();

        toastServiceSpy = TestBed.inject(ToastService) as MockedObject<ToastService>;
    });

    it('should create the component', () => {
        toastServiceSpy.getToastQueue.mockReturnValue(signal([]).asReadonly());

        const fixture = TestBed.createComponent(TafelToasterComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component).toBeTruthy();
    });

    it('effect triggers toast display when signal changes', () => {
        // Start with empty queue to avoid effect triggering during construction
        const toastQueueSignal = signal<ToastOptionsWithId[]>([]);
        toastServiceSpy.getToastQueue.mockReturnValue(toastQueueSignal.asReadonly());

        const fixture = TestBed.createComponent(TafelToasterComponent);
        const component = fixture.componentInstance;

        fixture.detectChanges();

        // Set up spy on the actual toaster component
        const addToastSpy = vi.spyOn(component.toaster, 'addToast');

        // Now trigger the toast by updating the queue
        const toastOptions: ToastOptionsWithId = { type: ToastType.ERROR, title: 'test-title', message: 'test-message', id: 1 };
        toastQueueSignal.set([toastOptions]);
        fixture.detectChanges();

        const toastProps = {
            titlePrefix: 'Fehler:',
            title: 'test-title',
            message: 'test-message',
            headerTextColor: 'white',
            bgColor: 'danger',
            autohide: true,
            delay: 5000,
            fade: true
        };
        expect(addToastSpy).toHaveBeenCalledWith(TafelToastComponent, toastProps);
    });

});
