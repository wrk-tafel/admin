import {TafelAutofocusDirective} from './tafel-autofocus.directive';
import {Component, ElementRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';

describe('TafelAutofocusDirective', () => {

    function setup() {
        const nativeElement = {
            focus: vi.fn().mockName('div.focus')
        };
        const hostElementRef = new ElementRef(nativeElement);

        TestBed.configureTestingModule({
            providers: [
                TafelAutofocusDirective,
                {provide: ElementRef, useValue: hostElementRef}
            ]
        });
        const directive = TestBed.inject(TafelAutofocusDirective);
        return {nativeElement, directive};
    }

    it('should focus after view loaded', () => {
        const {nativeElement, directive} = setup();

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

    // tafelAutofocusEnabled is a signal input, which can only be bound from a real host template -
    // a directive built directly via TestBed.inject() (as above) has no template to bind it from.
    @Component({
        template: '<input #el tafelAutofocus [tafelAutofocusEnabled]="enabled">',
        imports: [TafelAutofocusDirective]
    })
    class HostComponent {
        enabled = true;
    }

    it('should not focus when tafelAutofocusEnabled is bound to false', () => {
        TestBed.configureTestingModule({imports: [HostComponent]});
        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.enabled = false;
        // the view (and its native DOM nodes) exists right after createComponent(), before the
        // first detectChanges() runs bindings and the AfterViewInit hooks that schedule the focus
        const focusSpy = vi.spyOn(fixture.nativeElement.querySelector('input'), 'focus');

        vi.useFakeTimers();
        try {
            fixture.detectChanges();
            vi.runAllTimers();
            expect(focusSpy).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('should focus when tafelAutofocusEnabled is bound to true', () => {
        TestBed.configureTestingModule({imports: [HostComponent]});
        const fixture = TestBed.createComponent(HostComponent);
        const focusSpy = vi.spyOn(fixture.nativeElement.querySelector('input'), 'focus');

        vi.useFakeTimers();
        try {
            fixture.detectChanges();
            vi.runAllTimers();
            expect(focusSpy).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

});
