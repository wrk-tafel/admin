import {AfterViewInit, Directive, ElementRef, inject, input} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[tafelAutofocus]'
})
export class TafelAutofocusDirective implements AfterViewInit {
  private readonly host = inject(ElementRef);

  /**
   * Opt-in gate for the (rare) case where the same template renders several `tafelAutofocus`
   * elements and only one of them - decided at runtime - should actually receive focus (e.g. one
   * card per list entry, where only the newly-added entry should be focused). Left unbound, every
   * plain `tafelAutofocus` usage keeps focusing unconditionally, which is the vast majority of call
   * sites.
   */
  readonly tafelAutofocusEnabled = input(true);

  ngAfterViewInit() {
    if (!this.tafelAutofocusEnabled()) {
      return;
    }
    // schedule focus asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError in tests
    setTimeout(() => this.host.nativeElement.focus(), 0);
  }

}
