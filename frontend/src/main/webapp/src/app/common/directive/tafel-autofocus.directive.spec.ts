import {TafelAutofocusDirective} from './tafel-autofocus.directive';
import {ElementRef} from '@angular/core';

describe('TafelAutofocusDirective', () => {

  function setup() {
    const nativeElement = jasmine.createSpyObj('div', ['focus']);
    const hostElementRef = new ElementRef(nativeElement);

    const directive = new TafelAutofocusDirective(hostElementRef);
    return {nativeElement, directive};
  }

  it('should focus after view loaded', () => {
    const {nativeElement, directive} = setup();

    directive.ngAfterViewInit();

    expect(nativeElement.focus).toHaveBeenCalled();
  });

});
