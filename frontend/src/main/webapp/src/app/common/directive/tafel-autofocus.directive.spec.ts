import { TafelAutofocusDirective } from './tafel-autofocus.directive';
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

describe('TafelAutofocusDirective', () => {

    function setup() {
        const nativeElement = {
            focus: vi.fn().mockName('div.focus')
        };
        const hostElementRef = new ElementRef(nativeElement);

        TestBed.configureTestingModule({
            providers: [
                TafelAutofocusDirective,
                { provide: ElementRef, useValue: hostElementRef }
            ]
        });
        const directive = TestBed.inject(TafelAutofocusDirective);
        return { nativeElement, directive };
    }

    it('should focus after view loaded', () => {
        const { nativeElement, directive } = setup();

        // directive schedules focus with setTimeout(…, 0) — use fake timers to advance
        vi.useFakeTimers();
        try {
            directive.ngAfterViewInit();
            vi.runAllTimers();
            expect(nativeElement.focus).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

});
