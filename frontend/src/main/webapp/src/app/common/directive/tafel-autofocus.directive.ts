import {AfterViewInit, Directive, ElementRef, inject} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[tafelAutofocus]'
})
export class TafelAutofocusDirective implements AfterViewInit {
  private readonly host = inject(ElementRef);

  ngAfterViewInit() {
    // schedule focus asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError in tests
    setTimeout(() => this.host.nativeElement.focus(), 0);
  }

}
