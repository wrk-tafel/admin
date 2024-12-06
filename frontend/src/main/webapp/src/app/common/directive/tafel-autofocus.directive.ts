import {AfterViewInit, Directive, ElementRef} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[tafelAutofocus]'
})
export class TafelAutofocusDirective implements AfterViewInit {

  constructor(private readonly host: ElementRef) {
  }

  ngAfterViewInit() {
    this.host.nativeElement.focus();
  }

}
