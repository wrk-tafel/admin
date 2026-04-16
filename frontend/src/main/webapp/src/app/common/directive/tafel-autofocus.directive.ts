import {AfterViewInit, Directive, ElementRef} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[tafelAutofocus]'
})
export class TafelAutofocusDirective implements AfterViewInit {

  constructor(private readonly host: ElementRef) {
  }

  ngAfterViewInit() {
    // schedule focus asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError in tests
    setTimeout(() => this.host.nativeElement.focus(), 0);
  }

}
