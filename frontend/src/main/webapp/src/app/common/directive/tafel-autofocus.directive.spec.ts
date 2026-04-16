import { TafelAutofocusDirective } from './tafel-autofocus.directive';
import { ElementRef } from '@angular/core';

describe('TafelAutofocusDirective', () => {

    function setup() {
        const nativeElement = {
            focus: vi.fn().mockName("div.focus")
        };
        const hostElementRef = new ElementRef(nativeElement);

        const directive = new TafelAutofocusDirective(hostElementRef);
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
